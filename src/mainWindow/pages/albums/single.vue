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
      @playAll="playAlbum"
      @addToQueue="addAlbumToQueue"
      @onOptionalProviderChanged="onAlbumProviderChanged"
      :optionalProviders="albumSongProviders"
    />
  </div>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator'
import SongView from '@/mainWindow/components/songView/SongView.vue'

import { mixins } from 'vue-class-component'
import ContextMenuMixin from '@/utils/ui/mixins/ContextMenuMixin'
import { vxm } from '@/mainWindow/store'
import PlayerControls from '@/utils/ui/mixins/PlayerControls'
import RemoteSong from '@/utils/ui/mixins/remoteSongMixin'

@Component({
  components: {
    SongView
  }
})
export default class SingleAlbumView extends mixins(ContextMenuMixin, PlayerControls, RemoteSong) {
  private album: Album | null = null
  private songList: Song[] = []
  private optionalSongList: Record<string, string[]> = {}

  private extensionAlbumSongProviders: TabCarouselItem[] = []

  private get albumSongProviders(): TabCarouselItem[] {
    return [...this.extensionAlbumSongProviders]
  }

  get buttonGroups(): SongDetailButtons {
    return {
      enableContainer: true,
      enableLibraryStore: false
    }
  }

  get defaultDetails(): SongDetailDefaults {
    return {
      defaultTitle: this.album?.album_name,
      defaultSubtitle: this.album?.album_artist,
      defaultSubSubtitle: `${this.songList.length} Songs`,
      defaultCover: this.album?.album_coverPath_high
    }
  }

  async created() {
    this.fetchAlbum()
    this.fetchExtensionAlbumSongProviders()
    this.fetchSongList()
  }

  private fetchAlbum() {
    this.album = {
      album_id: this.$route.query.id as string,
      album_name: this.$route.query.name as string,
      album_coverPath_high: this.$route.query.cover_high as string,
      album_coverPath_low: this.$route.query.cover_low as string,
      album_artist: this.$route.query.album_artist as string,
      year: parseInt(this.$route.query.year as string)
    }
  }

  private async fetchSongList() {
    this.songList = await window.SearchUtils.searchSongsByOptions({
      album: {
        album_id: this.$route.query.id as string
      },
      sortBy: vxm.themes.songSortBy
    })
  }

  private playAlbum() {
    this.playTop(this.songList)
  }

  private addAlbumToQueue() {
    this.queueSong(this.songList)
  }

  private async fetchExtensionAlbumSongProviders() {
    const exts = await window.ExtensionUtils.getRegisteredAlbumSongProviders()
    if (exts) {
      for (const [key, title] of Object.entries(exts)) {
        if (title) {
          this.extensionAlbumSongProviders.push({ key, title })
        }
      }
    }
  }

  private async fetchExtensionSongs(key: string) {
    if (this.album) {
      const data = await window.ExtensionUtils.sendEvent({
        type: 'requestedAlbumSongs',
        data: [this.album],
        packageName: key
      })

      if (data && data[key]) {
        for (const s of data[key].songs) {
          if (!this.songList.find((val) => val._id === s._id)) {
            this.songList.push(s)

            if (!this.optionalSongList[key]) {
              this.optionalSongList[key] = []
            }
            this.optionalSongList[key].push(s._id)
          }
        }
      }
    }
  }

  private onAlbumProviderChanged({ key, checked }: { key: string; checked: boolean }) {
    if (checked) {
      this.fetchExtensionSongs(key)
    } else {
      this.songList = this.songList.filter((val) =>
        this.optionalSongList[key] ? !this.optionalSongList[key].includes(val._id) : true
      )
    }
  }
}
</script>
