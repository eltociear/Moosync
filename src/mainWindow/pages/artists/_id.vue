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
      @onRowContext="getSongMenu(arguments[0], arguments[1], undefined)"
      @playAll="playArtist"
      @addToQueue="addArtistToQueue"
      :detailsButtonGroup="buttonGroups"
    />
  </div>
</template>

<script lang="ts">
import { Component, Prop } from 'vue-property-decorator'
import SongView from '@/mainWindow/components/SongView.vue'

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
  private artist: artists | null = null

  get buttonGroups(): SongDetailButtons {
    return {
      enableContainer: true,
      enableLibraryStore: false
    }
  }

  get defaultDetails(): SongDetailDefaults {
    return {
      defaultTitle: this.artist?.artist_name,
      defaultSubSubtitle: `${this.artist?.artist_song_count} Songs`,
      defaultCover: this.artist?.artist_coverPath
    }
  }

  created() {
    this.fetchAlbum()
    this.fetchSongList()
  }

  private async fetchAlbum() {
    this.artist = (
      await window.SearchUtils.searchEntityByOptions({
        artist: {
          artist_id: this.$route.params.id
        }
      })
    )[0]
  }

  private async fetchSongList() {
    this.songList = await window.SearchUtils.searchSongsByOptions({
      artist: {
        artist_id: this.$route.params.id
      },
      sortBy: vxm.themes.sortBy
    })
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
