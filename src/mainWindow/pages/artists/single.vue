<!-- 
  _id.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
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
      @onRowContext="getSongMenu(arguments[0], arguments[1], undefined)"
      @playAll="playArtist"
      @addToQueue="addArtistToQueue"
      :detailsButtonGroup="buttonGroups"
    />
  </div>
</template>

<script lang="ts">
import { Component, Watch } from 'vue-property-decorator'
import SongView from '@/mainWindow/components/songView/SongView.vue'

import { mixins } from 'vue-class-component'
import ContextMenuMixin from '@/utils/ui/mixins/ContextMenuMixin'
import { arrayDiff } from '@/utils/common'
import { vxm } from '@/mainWindow/store'

@Component({
  components: {
    SongView
  }
})
export default class SingleArtistView extends mixins(ContextMenuMixin) {
  private songList: Song[] = []
  private artist: Artists | null = null

  private lateSongCount = 0

  get buttonGroups(): SongDetailButtons {
    return {
      enableContainer: true,
      enableLibraryStore: false
    }
  }

  get defaultDetails(): SongDetailDefaults {
    return {
      defaultTitle: this.artist?.artist_name,
      defaultSubSubtitle: `${this.artist?.artist_song_count ?? this.lateSongCount} Songs`,
      defaultCover: this.artist?.artist_coverPath
    }
  }

  @Watch('$route.query.id')
  private onArtistChange() {
    if (typeof this.$route.query.id === 'string') {
      this.artist = null
      this.songList = []
      this.fetchArtists()
      this.fetchSongList()
    }
  }

  created() {
    this.onArtistChange()
  }

  private async fetchArtists() {
    this.artist = (
      await window.SearchUtils.searchEntityByOptions<Artists>({
        artist: {
          artist_id: this.$route.query.id as string
        }
      })
    )[0]

    if (!this.artist?.artist_name) {
      this.artist = {
        artist_id: this.$route.query.id as string,
        artist_name: this.$route.query.name as string,
        artist_coverPath: this.$route.query.cover as string
      }
    }
  }

  private async fetchSpotifySonglist() {
    if (vxm.providers.loggedInSpotify) {
      for await (const songs of vxm.providers.spotifyProvider.getArtistSongs(this.$route.query.id as string)) {
        for (const s of songs) {
          if (!this.songList.find((val) => val._id === s._id)) {
            this.songList.push(s)
            this.lateSongCount++
          }
        }
      }
    }
  }

  private async fetchSongList() {
    if ((this.$route.query.id as string).startsWith('spotify')) {
      await this.fetchSpotifySonglist()
      this.lateSongCount = this.songList.length
    } else {
      this.songList = await window.SearchUtils.searchSongsByOptions({
        artist: {
          artist_id: this.$route.query.id as string
        },
        sortBy: vxm.themes.songSortBy
      })
    }
  }

  private sort(options: SongSortOptions) {
    vxm.themes.songSortBy = options
  }

  private getIsRemote(songs: Song[]) {
    for (const s of songs) {
      if (s._id.startsWith('youtube') || s._id.startsWith('spotify')) {
        return true
      }
    }
    return false
  }

  private getSongMenu(event: Event, songs: Song[], exclude: string | undefined) {
    this.getContextMenu(event, {
      type: 'SONGS',
      args: {
        songs: songs,
        exclude: exclude,
        isRemote: this.getIsRemote(songs),
        sortOptions: { callback: this.sort, current: vxm.themes.songSortBy },
        refreshCallback: () => (this.songList = arrayDiff(this.songList, songs))
      }
    })
  }

  private playArtist() {
    this.playTop(this.songList)
  }

  private addArtistToQueue() {
    this.queueSong(this.songList)
  }
}
</script>
