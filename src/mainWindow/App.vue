<!-- 
  App.vue is a part of Moosync.
  
  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
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
    <SetupModal />
  </div>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator'
import Titlebar from '@/commonComponents/Titlebar.vue'
import { mixins } from 'vue-class-component'
import ThemeHandler from '@/utils/ui/mixins/ThemeHandler'
import ContextMenu from './components/generic/Context.vue'
import NewPlaylistModal from '@/mainWindow/components/generic/NewPlaylistModal.vue'
import SongFromUrlModal from './components/generic/SongFromURLModal.vue'
import PlaylistFromUrlModal from './components/generic/PlaylistFromURLModal.vue'
import SetupModal from './components/setupModal/SetupModal.vue'

import { vxm } from './store'
import { bus } from './main'
import PlayerControls from '@/utils/ui/mixins/PlayerControls'
import { v1 } from 'uuid'
import 'animate.css'
import Vue from 'vue'
import { EventBus } from '@/utils/main/ipc/constants'

const stun = require('stun')

@Component({
  components: {
    Titlebar,
    ContextMenu,
    NewPlaylistModal,
    SongFromUrlModal,
    PlaylistFromUrlModal,
    SetupModal
  }
})
export default class App extends mixins(ThemeHandler, PlayerControls) {
  created() {
    this.registerLogger()
    this.registerNotifier()
    this.listenThemeChanges()
    this.listenExtensionEvents()
    this.listenExtensionRequests()
  }

  mounted() {
    this.registerFileOpenRequests()
    this.watchPlaylistUpdates()
    this.populatePlaylists()
    this.registerDevTools()
    this.registerFileDragListener()
    this.handleInitialSetup()
    // this.testStun()
  }

  private registerDevTools() {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'F11') {
        window.WindowUtils.toggleDevTools(true)
      } else if (e.code === 'F5') {
        location.reload()
      }
    })
  }

  public testStun(): void {
    stun.request('stun.l.google.com:19302', (err: any, res: any) => {
      if (err) {
        console.error(err)
      } else {
        const { address } = res.getXorAddress()
        console.log('ip: ', address)
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
    let RawPlaylists = await window.SearchUtils.searchEntityByOptions({
      playlist: true
    })
    let playlists: playlistInfo = {}
    for (let p of RawPlaylists) {
      playlists[p.playlist_id] = p.playlist_name
    }
    vxm.playlist.playlists = playlists
  }

  private registerLogger() {
    const preservedConsoleInfo = console.info
    const preservedConsoleError = console.error

    if (window.LoggerUtils && window.LoggerUtils.info && window.LoggerUtils.error) {
      console.info = (...args: any[]) => {
        preservedConsoleInfo.apply(console, args)
        window.LoggerUtils.info(args)
      }

      console.error = (...args: any[]) => {
        preservedConsoleError.apply(console, args)
        window.LoggerUtils.error(args)
      }

      window.onerror = (err) => window.LoggerUtils.error(err)

      Vue.config.errorHandler = (err, vm, info) => {
        window.LoggerUtils.error(err)
      }
    }
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
    let li = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
    const fileName = path.substring(li + 1)
    return fileName.split('.')[0]
  }

  private getDuration(src: string): Promise<number> {
    return new Promise(function (resolve) {
      var audio = new Audio()
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
      date_added: Date.now().toString(),
      type: 'LOCAL'
    }
  }

  private registerFileOpenRequests() {
    window.FileUtils.listenInitialFileOpenRequest(async (paths) => {
      if (paths.length > 0) {
        for (let [index, path] of paths.entries()) {
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
        console.log(event.dataTransfer.files.length)
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
    })
  }

  private listenExtensionEvents() {
    vxm.player.$watch('currentSong', (newVal: Song | undefined | null) => {
      if (newVal?.type !== 'LOCAL' && !newVal?.playbackUrl) {
        return
      }
      window.ExtensionUtils.sendEvent({
        type: 'onSongChanged',
        data: newVal
      })

      vxm.providers.lastfmProvider.scrobble(newVal)
    })

    vxm.player.$watch('playerState', (newVal: PlayerState) =>
      window.ExtensionUtils.sendEvent({
        type: 'onPlayerStateChanged',
        data: newVal
      })
    )

    vxm.player.$watch('volume', (newVal: number) =>
      window.ExtensionUtils.sendEvent({
        type: 'onVolumeChanged',
        data: newVal
      })
    )

    vxm.player.$watch('songQueue', (newVal: SongQueue) =>
      window.ExtensionUtils.sendEvent({
        type: 'onSongQueueChanged',
        data: newVal
      })
    )

    bus.$on('forceSeek', (newVal: number) =>
      window.ExtensionUtils.sendEvent({
        type: 'onSeeked',
        data: newVal
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
