<!-- 
  _id.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<route>
{
  "props": true
}
</route>
<template>
  <div class="w-100 h-100">
    <SongView
      :defaultDetails="defaultDetails"
      :songList="songList"
      :detailsButtonGroup="buttonGroups"
      :tableBusy="tableBusy"
      @onRowContext="getSongMenu(arguments[0], arguments[1])"
      @playAll="playPlaylist"
      @addToQueue="addPlaylistToQueue"
      @addToLibrary="addPlaylistToLibrary"
    />
  </div>
</template>

<script lang="ts">
import { Component, Prop } from 'vue-property-decorator'
import SongView from '@/mainWindow/components/songView/SongView.vue'

import { mixins } from 'vue-class-component'
import ContextMenuMixin from '@/utils/ui/mixins/ContextMenuMixin'
import { vxm } from '@/mainWindow/store'
import { arrayDiff } from '@/utils/common'
import { bus } from '@/mainWindow/main'
import { EventBus } from '@/utils/main/ipc/constants'

@Component({
  components: {
    SongView
  }
})
export default class SinglePlaylistView extends mixins(ContextMenuMixin) {
  @Prop({ default: () => () => undefined })
  private enableRefresh!: () => void

  private songList: Song[] = []

  private tableBusy = false

  private playlist: ExtendedPlaylist | null = null

  get buttonGroups(): SongDetailButtons {
    return {
      enableContainer: true,
      enableLibraryStore: !!this.isRemote
    }
  }

  get defaultDetails(): SongDetailDefaults {
    return {
      defaultTitle: this.playlist?.playlist_name ?? '',
      defaultSubSubtitle: `${(this.playlist?.playlist_song_count || this.songList.length) ?? 0} Songs`,
      defaultCover: this.playlist?.playlist_coverPath ?? ''
    }
  }

  private get isYoutube() {
    return this.$route.params.id.startsWith('youtube')
  }

  private get isSpotify() {
    return this.$route.params.id.startsWith('spotify')
  }

  private get isExtension() {
    return this.$route.params.extension
  }

  private get isRemote() {
    return this.isYoutube || this.isSpotify || this.isExtension
  }

  private async refresh(invalidateCache = false) {
    this.fetchPlaylist()

    this.songList = []
    if (!this.isYoutube && !this.isSpotify) await this.fetchLocalSongList()

    await this.fetchSongListAsync(invalidateCache)
  }

  created() {
    this.refresh()
  }

  mounted() {
    this.enableRefresh()
    this.listenGlobalRefresh()
  }

  private listenGlobalRefresh() {
    bus.$on(EventBus.REFRESH_PAGE, () => {
      this.refresh(true)
    })
  }

  private async fetchPlaylist() {
    this.playlist = {
      playlist_id: this.$route.params.playlist_id,
      playlist_name: this.$route.params.playlist_name,
      playlist_coverPath: this.$route.params.playlist_coverPath,
      playlist_song_count: parseInt(this.$route.params.playlist_song_count) ?? 0,
      playlist_path: this.$route.params.playlist_path,
      extension: this.$route.params.extension
    }
  }

  private async fetchLocalSongList() {
    this.songList = await window.SearchUtils.searchSongsByOptions({
      playlist: {
        playlist_id: this.$route.params.id
      },
      sortBy: vxm.themes.songSortBy
    })
  }

  private async fetchSongListAsync(invalidateCache = false) {
    let generator
    if (this.isYoutube)
      generator = vxm.providers.youtubeProvider.getPlaylistContent(
        this.$route.params.id.replace('youtube-playlist:', ''),
        invalidateCache
      )
    else if (this.isSpotify)
      generator = vxm.providers.spotifyProvider.getPlaylistContent(
        this.$route.params.id.replace('spotify-playlist:', ''),
        invalidateCache
      )

    if (generator) {
      for await (const items of generator) {
        this.songList.push(...items)
      }
      return
    }

    if (this.playlist?.extension) {
      const data = await window.ExtensionUtils.sendEvent({
        type: 'requestedPlaylistSongs',
        data: [this.playlist.playlist_id],
        packageName: this.playlist.extension
      })

      this.songList.push(...(data[this.playlist.extension]?.songs ?? []))
    }
  }

  private sort(options: SongSortOptions) {
    vxm.themes.songSortBy = options
  }

  private getSongMenu(event: Event, songs: Song[]) {
    this.getContextMenu(event, {
      type: 'PLAYLIST_CONTENT',
      args: {
        songs: songs,
        isRemote: !!this.isRemote,
        sortOptions: { callback: this.sort, current: vxm.themes.songSortBy },
        refreshCallback: () => (this.songList = arrayDiff<Song>(this.songList, songs))
      }
    })
  }

  private playPlaylist() {
    this.playTop(this.songList)
  }

  private addPlaylistToQueue() {
    this.queueSong(this.songList)
  }

  private addPlaylistToLibrary() {
    this.addSongsToLibrary(...this.songList)
  }
}
</script>
