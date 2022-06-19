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
      @playAll="playArtist"
      @addToQueue="addArtistToQueue"
      @onOptionalProviderChanged="onArtistProviderChanged"
      :detailsButtonGroup="buttonGroups"
      :optionalProviders="artistSongProviders"
    />
  </div>
</template>

<script lang="ts">
import { Component, Watch } from 'vue-property-decorator'
import SongView from '@/mainWindow/components/songView/SongView.vue'

import { mixins } from 'vue-class-component'
import ContextMenuMixin from '@/utils/ui/mixins/ContextMenuMixin'
import { vxm } from '@/mainWindow/store'
import { GenericProvider } from '@/utils/ui/providers/generics/genericProvider'
import RemoteSong from '@/utils/ui/mixins/remoteSongMixin'

@Component({
  components: {
    SongView
  }
})
export default class SingleArtistView extends mixins(ContextMenuMixin, RemoteSong) {
  private songList: Song[] = []
  private optionalSongList: Record<string, string[]> = {}
  private artist: Artists | null = null

  private extensionArtistSongProviders: ProviderHeaderOptions[] = []

  private get artistSongProviders(): ProviderHeaderOptions[] {
    return [
      {
        title: 'Youtube',
        key: vxm.providers.youtubeProvider.key
      },
      {
        title: 'Spotify',
        key: vxm.providers.spotifyProvider.key
      },
      ...this.extensionArtistSongProviders
    ]
  }

  get buttonGroups(): SongDetailButtons {
    return {
      enableContainer: true,
      enableLibraryStore: false
    }
  }

  get defaultDetails(): SongDetailDefaults {
    return {
      defaultTitle: this.artist?.artist_name,
      defaultSubSubtitle: `${this.songList.length} Songs`,
      defaultCover: this.artist?.artist_coverPath
    }
  }

  @Watch('$route.query.id')
  private async onArtistChange() {
    if (typeof this.$route.query.id === 'string') {
      this.artist = null
      this.songList = []
      this.fetchArtists()
      this.fetchSongList()
    }
  }

  private async fetchExtensionArtistSongProviders() {
    const exts = await window.ExtensionUtils.getRegisteredArtistSongProviders()
    if (exts) {
      for (const [key, title] of Object.entries(exts)) {
        if (title) {
          this.extensionArtistSongProviders.push({ key, title })
        }
      }
    }
  }

  created() {
    this.fetchExtensionArtistSongProviders()
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
        artist_coverPath: this.$route.query.cover as string,
        artist_extra_info: JSON.parse((this.$route.query.extra_info as string) || '{}')
      }
    }

    if (!this.artist.artist_coverPath) {
      let fetchedArtist = await this.fetchRemoteArtistDetails(this.artist)
      this.artist = {
        ...this.artist,
        artist_coverPath: fetchedArtist?.artist_coverPath
      }
    }
  }

  private async fetchProviderSonglist(provider: GenericProvider) {
    if (this.artist) {
      for await (const songs of provider.getArtistSongs(this.artist)) {
        for (const s of songs) {
          if (!this.songList.find((val) => val._id === s._id)) {
            this.songList.push(s)

            if (!this.optionalSongList[provider.key]) {
              this.optionalSongList[provider.key] = []
            }
            this.optionalSongList[provider.key].push(s._id)
          }
        }
      }
    }
  }

  private async fetchSongList() {
    this.songList = await window.SearchUtils.searchSongsByOptions({
      artist: {
        artist_id: this.$route.query.id as string
      },
      sortBy: vxm.themes.songSortBy
    })
  }

  private getIsRemote(songs: Song[]) {
    for (const s of songs) {
      if (s._id.startsWith('youtube') || s._id.startsWith('spotify') || s.providerExtension) {
        return true
      }
    }
    return false
  }

  private playArtist() {
    this.playTop(this.songList)
  }

  private addArtistToQueue() {
    this.queueSong(this.songList)
  }

  private async fetchExtensionSongs(key: string) {
    if (this.artist) {
      const data = await window.ExtensionUtils.sendEvent({
        type: 'requestedArtistSongs',
        data: [this.artist],
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

  private onArtistProviderChanged({ key, checked }: { key: string; checked: boolean }) {
    if (checked) {
      if (key === vxm.providers.youtubeProvider.key) {
        if (vxm.providers.loggedInYoutube) {
          this.fetchProviderSonglist(vxm.providers.youtubeProvider)
        }
        return
      }

      if (key === vxm.providers.spotifyProvider.key) {
        if (vxm.providers.loggedInSpotify) {
          this.fetchProviderSonglist(vxm.providers.spotifyProvider)
        }
        return
      }

      this.fetchExtensionSongs(key)
    } else {
      this.songList = this.songList.filter((val) =>
        this.optionalSongList[key] ? !this.optionalSongList[key].includes(val._id) : true
      )
    }
  }
}
</script>
