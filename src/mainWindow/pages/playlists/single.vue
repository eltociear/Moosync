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
      :isLoading="isLoading"
      @onRowContext="getSongMenu"
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

  private isLoading = false

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
      defaultSubSubtitle: this.$tc('songView.details.songCount', this.songList.length),
      defaultCover: this.playlist?.playlist_coverPath ?? ''
    }
  }

  private get isYoutube() {
    return (this.$route.query.id as string)?.startsWith('youtube')
  }

  private get isSpotify() {
    return (this.$route.query.id as string)?.startsWith('spotify')
  }

  private get isExtension() {
    return this.$route.query.extension
  }

  private get isRemote() {
    return this.isYoutube || this.isSpotify || this.isExtension
  }

  private async refresh(invalidateCache = false) {
    this.fetchPlaylist()

    this.songList = []
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

  private fetchPlaylist() {
    this.playlist = {
      playlist_id: this.$route.query.playlist_id as string,
      playlist_name: this.$route.query.playlist_name as string,
      playlist_coverPath: this.$route.query.playlist_coverPath as string,
      playlist_song_count: parseInt(this.$route.query.playlist_song_count as string) ?? 0,
      playlist_path: this.$route.query.playlist_path as string | undefined,
      extension: this.$route.query.extension as string | undefined
    }
  }

  private async fetchLocalSongList() {
    this.isLoading = true
    if (this.playlist) {
      this.songList = await window.SearchUtils.searchSongsByOptions({
        playlist: {
          playlist_id: this.playlist.playlist_id as string
        },
        sortBy: vxm.themes.songSortBy
      })
    }
    this.isLoading = false
  }

  private async fetchYoutube(invalidateCache = false) {
    this.isLoading = true
    const generator = vxm.providers.youtubeProvider.getPlaylistContent(
      (this.$route.query.id as string)?.replace('youtube-playlist:', ''),
      invalidateCache
    )

    if (generator) {
      for await (const items of generator) {
        this.songList.push(...items)
      }
    }
    this.isLoading = false
  }

  private async fetchSpotify(invalidateCache = false) {
    this.isLoading = true
    const generator = vxm.providers.spotifyProvider.getPlaylistContent(
      (this.$route.query.id as string)?.replace('spotify-playlist:', ''),
      invalidateCache
    )

    if (generator) {
      for await (const items of generator) {
        this.songList.push(...items)
      }
    }

    this.isLoading = false
  }

  private async fetchExtension(invalidateCache = false) {
    this.isLoading = true
    const extension = this.playlist?.extension
    const playlistId = this.playlist?.playlist_id

    if (playlistId && extension) {
      const data = await window.ExtensionUtils.sendEvent({
        type: 'requestedPlaylistSongs',
        data: [playlistId, invalidateCache],
        packageName: extension
      })

      if (data && data[extension]) {
        this.songList.push(...(data[extension] as SongsReturnType).songs)
      }
    }

    this.isLoading = false
  }

  private async fetchSongListAsync(invalidateCache = false) {
    if (this.playlist) {
      if (!this.isRemote) {
        return this.fetchLocalSongList()
      }

      if (!this.isExtension) {
        if (this.isYoutube) return this.fetchYoutube(invalidateCache)
        else if (this.isSpotify) return this.fetchSpotify(invalidateCache)
      } else {
        return this.fetchExtension(invalidateCache)
      }
    }
  }

  private getSongMenu(event: Event, songs: Song[]) {
    console.log(!!this.isRemote)
    this.getContextMenu(event, {
      type: 'SONGS',
      args: {
        songs: songs,
        isRemote: !!this.isRemote,
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
