<!-- 
  index.vue is a part of Moosync.
  
  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div class="w-100" @contextmenu="getGeneralSongsMenu">
    <SongView
      :detailsButtonGroup="buttonGroups"
      :defaultDetails="defaultDetails"
      :songList="songList"
      @onRowContext="getSongMenu(arguments[0], arguments[1], undefined)"
    />
  </div>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator'
import SongView from '@/mainWindow/components/songView/SongView.vue'

import { mixins } from 'vue-class-component'
import ContextMenuMixin from '@/utils/ui/mixins/ContextMenuMixin'
import { vxm } from '@/mainWindow/store'
import { arrayDiff } from '@/utils/common'

@Component({
  components: {
    SongView
  }
})
export default class AllSongs extends mixins(ContextMenuMixin) {
  private songList: Song[] = []
  private currentSong: Song | null | undefined = null

  get playlists() {
    return vxm.playlist.playlists
  }

  get buttonGroups(): SongDetailButtons {
    return {
      enableContainer: true,
      enableLibraryStore: false
    }
  }

  get defaultDetails(): SongDetailDefaults {
    return {
      defaultTitle: `${this.songList.length} Song${this.songList.length !== 1 ? 's' : ''}`
    }
  }

  mounted() {
    this.requestSongs()
  }

  private async requestSongs() {
    this.songList = await window.SearchUtils.searchSongsByOptions({ sortBy: vxm.themes.sortBy })
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

  private getGeneralSongsMenu(event: Event) {
    this.getContextMenu(event, {
      type: 'GENERAL_SONGS',
      args: {
        refreshCallback: this.requestSongs,
        sortOptions: {
          callback: this.sort,
          current: vxm.themes.sortBy
        }
      }
    })
  }
}
</script>
