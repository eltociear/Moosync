<!-- 
  _id.vue is a part of Moosync.
  
  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<route>
{
  "props": true
}
</route>
<template>
  <div class="w-100">
    <SongView
      :defaultDetails="defaultDetails"
      :songList="songList"
      :detailsButtonGroup="buttonGroups"
      :tableBusy="tableBusy"
      @onRowContext="getSongMenu(arguments[0], arguments[1], undefined)"
      @playAll="playPlaylist"
      @addToQueue="addPlaylistToQueue"
      @addToLibrary="addPlaylistToLibrary"
    />
  </div>
</template>

<script lang="ts">
import { Component, Prop } from 'vue-property-decorator'
import SongView from '@/mainWindow/components/SongView.vue'

import { mixins } from 'vue-class-component'
import ContextMenuMixin from '@/utils/ui/mixins/ContextMenuMixin'
import { vxm } from '@/mainWindow/store'
import { arrayDiff } from '@/utils/common'

@Component({
  components: {
    SongView
  }
})
export default class SinglePlaylistView extends mixins(ContextMenuMixin) {
  private songList: Song[] = []

  private tableBusy: boolean = false

  private playlist: Playlist | null = null

  get buttonGroups(): SongDetailButtons {
    return {
      enableContainer: true,
      enableLibraryStore: this.isRemote
    }
  }

  get defaultDetails(): SongDetailDefaults {
    return {
      defaultTitle: this.playlist?.playlist_name ?? '',
      defaultSubSubtitle: `${this.playlist?.playlist_song_count ?? 0} Songs`,
      defaultCover: this.playlist?.playlist_coverPath ?? ''
    }
  }

  private get isYoutube() {
    return this.$route.params.id.startsWith('youtube-')
  }

  private get isSpotify() {
    return this.$route.params.id.startsWith('spotify-')
  }

  private get isRemote() {
    return this.isYoutube || this.isSpotify
  }

  async created() {
    this.fetchPlaylist()
    await this.fetchSongList()
    await this.fetchAsyncGen()
  }

  private async fetchPlaylist() {
    if (this.isYoutube) {
      await this.fetchPlaylistYoutube()
    } else if (this.isSpotify) {
      await this.fetchPlaylistSpotify()
    } else {
      this.playlist = (
        await window.SearchUtils.searchEntityByOptions({
          playlist: {
            playlist_id: this.$route.params.id
          }
        })
      )[0]
    }
  }

  private async fetchPlaylistYoutube() {
    this.playlist =
      (await vxm.providers.youtubeProvider.getPlaylistDetails(this.$route.params.id.replace('youtube-', ''))) ?? null
  }

  private async fetchPlaylistSpotify() {
    this.playlist =
      (await vxm.providers.spotifyProvider.getPlaylistDetails(this.$route.params.id.replace('spotify-', ''))) ?? null
  }

  private async fetchSongList() {
    this.songList = await window.SearchUtils.searchSongsByOptions({
      playlist: {
        playlist_id: this.$route.params.id
      },
      sortBy: vxm.themes.sortBy
    })
  }

  private async fetchAsyncGen() {
    let generator
    if (this.isYoutube)
      generator = vxm.providers.youtubeProvider.getPlaylistContent(this.$route.params.id.replace('youtube-', ''))
    else if (this.isSpotify)
      generator = vxm.providers.spotifyProvider.getPlaylistContent(this.$route.params.id.replace('spotify-', ''))

    if (generator)
      for await (const items of generator) {
        this.songList.push(...items)
      }
  }

  private sort(options: sortOptions) {
    vxm.themes.sortBy = options
  }

  private getSongMenu(event: Event, songs: Song[], exclude: string | undefined) {
    this.getContextMenu(event, {
      type: 'PLAYLIST_CONTENT',
      args: {
        songs: songs,
        isRemote: this.isRemote,
        sortOptions: { callback: this.sort, current: vxm.themes.sortBy },
        refreshCallback: () => (this.songList = arrayDiff(this.songList, songs))
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
