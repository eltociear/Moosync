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
import { Component } from 'vue-property-decorator'
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

  created() {
    this.fetchArtists()
    this.fetchSongList()
  }

  private async fetchArtists() {
    this.artist = (
      await window.SearchUtils.searchEntityByOptions<Artists>({
        artist: {
          artist_id: this.$route.params.id
        }
      })
    )[0]

    if (!this.artist?.artist_name) {
      this.artist = {
        artist_id: this.$route.params.id,
        artist_name: this.$route.params.name,
        artist_coverPath: this.$route.params.cover
      }
    }
  }

  private async fetchSpotifySonglist() {
    if (vxm.providers.loggedInSpotify) {
      for await (const songs of vxm.providers.spotifyProvider.getArtistSongs(this.$route.params.id)) {
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
    if (this.$route.params.id.startsWith('spotify')) {
      await this.fetchSpotifySonglist()
      this.lateSongCount = this.songList.length
    } else {
      this.songList = await window.SearchUtils.searchSongsByOptions({
        artist: {
          artist_id: this.$route.params.id
        },
        sortBy: vxm.themes.sortBy
      })
    }
  }

  private sort(options: sortOptions) {
    vxm.themes.sortBy = options
  }

  private getSongMenu(event: Event, songs: Song[], exclude: string | undefined) {
    this.getContextMenu(event, {
      type: 'SONGS',
      args: {
        songs: songs,
        exclude: exclude,
        sortOptions: { callback: this.sort, current: vxm.themes.sortBy },
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
