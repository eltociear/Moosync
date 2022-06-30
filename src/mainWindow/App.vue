<!-- 
  App.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div id="app">
    <ContextMenu />
    <Titlebar />
    <div class="appContainer">
      <router-view></router-view>
    </div>
    <NewPlaylistModal />
    <SongFromUrlModal />
    <PlaylistFromUrlModal />
    <SongInfoModal />
    <SetupModal />
    <OAuthModal />
    <FormModal />
    <EntityInfoModal />
  </div>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator'
import Titlebar from '@/commonComponents/Titlebar.vue'
import { mixins } from 'vue-class-component'
import ThemeHandler from '@/utils/ui/mixins/ThemeHandler'
import ContextMenu from './components/generic/Context.vue'
import NewPlaylistModal from '@/mainWindow/components/modals/NewPlaylistModal.vue'
import SongFromUrlModal from './components/modals/SongFromURLModal.vue'
import PlaylistFromUrlModal from './components/modals/PlaylistFromURLModal.vue'
import SetupModal from './components/setupModal/SetupModal.vue'
import SongInfoModal from './components/modals/SongInfoModal.vue'

import { vxm } from './store'
import { bus } from './main'
import PlayerControls from '@/utils/ui/mixins/PlayerControls'
import { v1 } from 'uuid'
import { EventBus } from '@/utils/main/ipc/constants'
import OAuthModal from './components/modals/OAuthModal.vue'
import FormModal from './components/modals/FormModal.vue'
import EntityInfoModal from './components/modals/EntityInfoModal.vue'

@Component({
  components: {
    Titlebar,
    ContextMenu,
    NewPlaylistModal,
    SongFromUrlModal,
    PlaylistFromUrlModal,
    SetupModal,
    SongInfoModal,
    OAuthModal,
    FormModal,
    EntityInfoModal
  }
})
export default class App extends mixins(ThemeHandler, PlayerControls) {
  created() {
    this.registerNotifier()
    this.listenThemeChanges()
    this.listenExtensionEvents()
    this.listenExtensionRequests()
    this.useInvidious()

    this.themeStore = vxm.themes
  }

  mounted() {
    this.registerFileOpenRequests()
    this.watchPlaylistUpdates()
    this.populatePlaylists()
    this.registerKeyboardHotkeys()
    this.registerFileDragListener()
    this.handleInitialSetup()
    this.checkUpdate()
  }

  private async useInvidious() {
    const useInvidious = (await window.PreferenceUtils.loadSelective<Checkbox[]>('system', false, []))?.find(
      (val) => val.key === 'use_invidious'
    )?.enabled
    vxm.providers.useInvidious = useInvidious ?? false
  }

  private checkUpdate() {
    window.UpdateUtils.listenUpdate((available) => {
      console.debug('Got update')
      vxm.themes.isUpdateAvailable = available
    })

    window.UpdateUtils.check()
  }

  private registerKeyboardHotkeys() {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'F11') {
        window.WindowUtils.toggleDevTools(true)
      } else if (e.code === 'F5') {
        location.reload()
      }

      if (e.code === 'F1') {
        window.WindowUtils.openExternal('https://github.com/Moosync/Moosync#readme')
      }
    })
  }

  private watchPlaylistUpdates() {
    vxm.playlist.$watch('updated', (updated: boolean) => {
      if (updated) {
        vxm.playlist.updated = false
        this.populatePlaylists()
      }
    })
  }

  private async populatePlaylists() {
    const RawPlaylists = await window.SearchUtils.searchEntityByOptions<Playlist>({
      playlist: true
    })
    const playlists: playlistInfo = {}
    for (const p of RawPlaylists) {
      playlists[p.playlist_id] = p.playlist_name
    }
    vxm.playlist.playlists = playlists
  }

  private registerNotifier() {
    window.NotifierUtils.registerMainProcessNotifier((obj) => {
      vxm.notifier.emit(obj)
      if (obj.id === 'started-scan' || obj.id === 'completed-scan') {
        if (obj.id === 'completed-scan') {
          vxm.themes.refreshPage = true
        }
        this.$toasted.show(obj.message, {
          className: obj.id === 'completed-scan' ? 'success-toast' : 'custom-toast'
        })
      }
    })
  }

  private getFileName(path: string) {
    const li = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
    const fileName = path.substring(li + 1)
    return fileName.split('.')[0]
  }

  private getDuration(src: string): Promise<number> {
    return new Promise(function (resolve) {
      const audio = new Audio()
      audio.addEventListener('loadedmetadata', function () {
        resolve(audio.duration)
      })
      audio.src = 'media://' + src
    })
  }

  private async getSongFromPath(path: string): Promise<Song> {
    const results = await window.SearchUtils.searchSongsByOptions({
      song: {
        path: path
      }
    })
    if (results.length > 0) {
      return results[0]
    }

    const duration = await this.getDuration(path)
    return {
      _id: v1(),
      title: this.getFileName(path),
      duration: duration,
      artists: [],
      path: path,
      date_added: Date.now(),
      type: 'LOCAL'
    }
  }

  private registerFileOpenRequests() {
    window.FileUtils.listenInitialFileOpenRequest(async (paths) => {
      if (paths.length > 0) {
        for (const [index, path] of paths.entries()) {
          const song = await this.getSongFromPath(path)
          if (index === 0) {
            await this.playTop([song])
          } else {
            await this.queueSong([song])
          }
        }
      }
    })
    window.WindowUtils.mainWindowHasMounted()
  }

  private registerFileDragListener() {
    document.addEventListener('drop', async (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.dataTransfer) {
        console.debug('Got drag files', event.dataTransfer.files.length)
        for (const f of event.dataTransfer.files) {
          if (f) {
            const song = await this.getSongFromPath(f.path)
            await this.playTop([song])
          }
        }
      }
    })

    document.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.stopPropagation()
    })
  }

  private listenExtensionRequests() {
    window.ExtensionUtils.listenRequests((data) => {
      if (data.type === 'get-current-song') {
        window.ExtensionUtils.replyToRequest({ ...data, data: vxm.player.currentSong })
        return
      }

      if (data.type === 'get-volume') {
        window.ExtensionUtils.replyToRequest({ ...data, data: vxm.player.volume })
        return
      }

      if (data.type === 'get-time') {
        window.ExtensionUtils.replyToRequest({ ...data, data: vxm.player.currentTime })
        return
      }

      if (data.type === 'get-queue') {
        window.ExtensionUtils.replyToRequest({ ...data, data: vxm.player.queue })
        return
      }

      if (data.type === 'get-player-state') {
        window.ExtensionUtils.replyToRequest({ ...data, data: vxm.player.playerState })
      }

      if (data.type === 'play') {
        window.ExtensionUtils.replyToRequest({ ...data, data: this.play() })
      }

      if (data.type === 'pause') {
        window.ExtensionUtils.replyToRequest({ ...data, data: this.pause() })
      }

      if (data.type === 'stop') {
        window.ExtensionUtils.replyToRequest({ ...data, data: this.stop() })
      }

      if (data.type === 'prev') {
        window.ExtensionUtils.replyToRequest({ ...data, data: this.prevSong() })
      }

      if (data.type === 'next') {
        window.ExtensionUtils.replyToRequest({ ...data, data: this.nextSong() })
      }

      if (data.type === 'open-login-modal') {
        bus.$emit(EventBus.SHOW_OAUTH_MODAL, data.data)
        window.ExtensionUtils.replyToRequest({ ...data, data: true })
      }

      if (data.type === 'close-login-modal') {
        bus.$emit(EventBus.HIDE_OAUTH_MODAL)
        window.ExtensionUtils.replyToRequest({ ...data, data: true })
      }

      if (data.type === 'show-toast') {
        this.$toasted.show(data.data.message, {
          duration: Math.max(data.data.duration, 5000),
          type: data.data.type
        })
        window.ExtensionUtils.replyToRequest({ ...data, data: true })
      }
    })
  }

  private listenExtensionEvents() {
    vxm.player.$watch(
      'currentSong',
      (newVal: Song | undefined | null) => {
        console.debug('Got song change request for extension host')
        if (newVal?.type !== 'LOCAL' && !newVal?.playbackUrl) {
          console.debug('Song is missing playback url')
          return
        }

        window.ExtensionUtils.sendEvent({
          type: 'songChanged',
          data: [newVal]
        })

        vxm.providers.lastfmProvider.scrobble(newVal)
      },
      { deep: true, immediate: true }
    )

    vxm.player.$watch('playerState', (newVal: PlayerState) =>
      window.ExtensionUtils.sendEvent({
        type: 'playerStateChanged',
        data: [newVal]
      })
    )

    vxm.player.$watch('volume', (newVal: number) =>
      window.ExtensionUtils.sendEvent({
        type: 'volumeChanged',
        data: [newVal]
      })
    )

    vxm.player.$watch('songQueue', (newVal: SongQueue) =>
      window.ExtensionUtils.sendEvent({
        type: 'songQueueChanged',
        data: [newVal]
      })
    )

    bus.$on('forceSeek', (newVal: number) =>
      window.ExtensionUtils.sendEvent({
        type: 'seeked',
        data: [newVal]
      })
    )
  }

  private listenThemeChanges() {
    window.ThemeUtils.listenThemeChanged((theme) => this.setColorsToRoot(theme))
    window.ThemeUtils.listenSongViewChanged((menu) => (vxm.themes.songView = menu))
  }

  private async handleInitialSetup() {
    const isFirstLaunch = await window.PreferenceUtils.loadSelective<boolean>('isFirstLaunch', false, true)
    if (isFirstLaunch) {
      bus.$emit(EventBus.SHOW_SETUP_MODAL)
      await window.FileUtils.scan()
      await window.PreferenceUtils.saveSelective('isFirstLaunch', false, false)
    }
  }
}
</script>
