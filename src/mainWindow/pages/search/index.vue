<!-- 
  index.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div class="w-100 h-100 tab-outer-container">
    <b-tabs content-class="mt-3 tab-inner-container" justified class="h-100">
      <div v-for="i in items" :key="i.key">
        <b-tab lazy v-if="showTab(i.tab)" :title="i.title ? i.title : i.tab" :id="i.key" :key="i.key">
          <RecycleScroller
            class="scroller"
            :items="ComputeTabContent(i.tab)"
            :item-size="80"
            :key-field="ComputeTabKeyField(i.tab)"
            v-slot="{ item }"
            v-if="ComputeTabContent(i.tab).length > 0"
            :direction="'vertical'"
          >
            <SingleSearchResult
              :title="ComputeTabTitle(i.tab, item)"
              :subtitle="ComputeTabSubTitle(i.tab, item)"
              :coverImg="ComputeTabImage(i.tab, item)"
              :divider="true"
              :id="item"
              :showButtons="true"
              :playable="isPlayable(item)"
              @imgClick="imgClickHandler(i.tab, $event)"
              @titleClick="titleClickHandler(i.tab, $event)"
              @onContextMenu="contextMenuHandler(i.tab, ...arguments)"
            />
          </RecycleScroller>
          <b-container v-else class="mt-5 mb-3">
            <b-row align-v="center" align-h="center">
              <b-col cols="auto" v-if="i.loading"><b-spinner class="spinner" label="Loading..."></b-spinner></b-col>
              <b-col v-else class="nothing-found"> Nothing found... </b-col>
            </b-row>
          </b-container>
          <b-button class="load-more" v-if="getLoadMore(i.tab)" @click="handleLoadMore(i.tab)"
            >Load more from Spotify</b-button
          >
        </b-tab>
      </div>
    </b-tabs>
  </div>
</template>

<script lang="ts">
import { Component, Watch } from 'vue-property-decorator'
import SingleSearchResult from '@/mainWindow/components/generic/SingleSearchResult.vue'
import { mixins } from 'vue-class-component'
import RouterPushes from '@/utils/ui/mixins/RouterPushes'
import ContextMenuMixin from '@/utils/ui/mixins/ContextMenuMixin'
import ImgLoader from '@/utils/ui/mixins/ImageLoader'
import { vxm } from '@/mainWindow/store'

@Component({
  components: {
    SingleSearchResult
  }
})
export default class SearchPage extends mixins(RouterPushes, ContextMenuMixin, ImgLoader) {
  private term = ''
  private result: SearchResult = {}
  private items: { tab: string; count: number; key: string; loading?: boolean; extension?: string; title?: string }[] =
    [
      { tab: 'Songs', count: 0, key: 'Songs-0' },
      { tab: 'Albums', count: 0, key: 'Albums-0' },
      { tab: 'Artists', count: 0, key: 'Artists-0' },
      { tab: 'Genres', count: 0, key: 'Genres-0' },
      { tab: 'Playlists', count: 0, key: 'Playlists-0' },
      { tab: 'Youtube', count: 0, key: 'Youtube-0', loading: false },
      { tab: 'Spotify', count: 0, key: 'Spotify-0', loading: false }
    ]

  private loadedMore: { [key: string]: boolean } = { artists: false }

  private showTab(tab: string) {
    if (tab === 'Spotify') {
      return vxm.providers.loggedInSpotify
    }
    return true
  }

  private async fetchData() {
    window.SearchUtils.searchAll(`%${this.term}%`).then((data) => {
      this.result = {
        ...this.result,
        ...data
      }
      this.refreshLocal()
    })

    const youtubeItem = this.items.find((val) => val.tab === 'Youtube')
    if (youtubeItem) {
      youtubeItem.loading = true

      if (vxm.providers.loggedInYoutube) {
        vxm.providers.youtubeProvider.searchSongs(this.term).then((data) => {
          this.result.youtube = data
          this.refreshYoutube()
          youtubeItem.loading = false
        })
      } else {
        window.SearchUtils.searchYT(this.term, undefined, false, false, true).then((data) => {
          this.result.youtube = data
          this.refreshYoutube()
          youtubeItem.loading = false
        })
      }
    }

    const spotifyItem = this.items.find((val) => val.tab === 'Spotify')
    if (spotifyItem) {
      if (vxm.providers.loggedInSpotify) {
        spotifyItem.loading = true
        vxm.providers.spotifyProvider.searchSongs(this.term).then((data) => {
          this.result.spotify = data
          this.refreshSpotify()
          spotifyItem.loading = false
        })
      }
    }

    window.ExtensionUtils.sendEvent({ type: 'requestSearchResult', data: [this.term] }).then((data) => {
      for (const [key, val] of Object.entries(data)) {
        if (val) {
          if (!this.items.find((val) => val.tab === key)) {
            this.items.push({
              tab: key,
              title: val.providerName,
              count: 0,
              key: `${key}-0`,
              loading: true,
              extension: key
            })
          }

          if (!this.result.extension) {
            this.result.extension = {}
          }

          this.result.extension[key] = val.songs
          this.refreshExtension(key)
        }
      }
    })
  }

  private refreshLocal() {
    for (let i = 0; i < 5; i++) {
      this.items[i].key = this.items[i].key.split('-')[0] + this.items[i].count++
    }
  }

  private refreshYoutube() {
    this.items[5].key = 'Youtube' + this.items[5].count++
  }

  private refreshSpotify() {
    this.items[6].key = 'Spotify' + this.items[6].count++
  }

  private refreshExtension(packageName: string) {
    const item = this.items.find((val) => val.extension === packageName)
    if (item) {
      item.key = `${packageName}-${item.count++}`
    }
  }

  private getLoadMore(tab: string) {
    if (tab === 'Artists' && !this.loadedMore.artists) return true
    return false
  }

  private isPlayable(item: Song | Album | Artists | Genre | Playlist) {
    if ((item as Artists).artist_id?.startsWith('spotify')) return false
    return true
  }

  private async handleLoadMore(tab: string) {
    if (tab === 'Artists') {
      const resp = await vxm.providers.spotifyProvider.searchArtists(this.term)
      for (const a of resp) {
        if (!this.result.artists) {
          this.result.artists = []
        }

        if (!this.result.artists.find((val) => val.artist_id === a.artist_id)) {
          this.result.artists.push(a)
        }
        this.loadedMore.artists = true
      }
    }
  }

  private ComputeTabKeyField(tab: string) {
    switch (tab) {
      case 'Songs':
      case 'Youtube':
      case 'Spotify':
      default:
        return '_id'
      case 'Albums':
        return 'album_id'
      case 'Artists':
        return 'artist_id'
      case 'Genres':
        return 'genre_id'
      case 'Playlists':
        return 'playlist_id'
    }
  }

  private ComputeTabContent(tab: string) {
    if (this.result) {
      switch (tab) {
        case 'Songs':
          return this.result.songs ?? []
        case 'Albums':
          return this.result.albums ?? []
        case 'Artists':
          return this.result.artists ?? []
        case 'Genres':
          return this.result.genres ?? []
        case 'Playlists':
          return this.result.playlists ?? []
        case 'Youtube':
          return this.result.youtube ?? []
        case 'Spotify':
          return this.result.spotify ?? []
        default:
          return (this.result.extension && this.result.extension[tab]) ?? []
      }
    }
    return []
  }

  private ComputeTabTitle(tab: string, item: Song | Album | Artists | Genre | Playlist) {
    if (item) {
      switch (tab) {
        case 'Spotify':
        case 'Youtube':
        case 'Songs':
        default:
          return (item as Song).title
        case 'Albums':
          return (item as Album).album_name
        case 'Artists':
          return (item as Artists).artist_name
        case 'Genres':
          return (item as Genre).genre_name
        case 'Playlists':
          return (item as Playlist).playlist_name
      }
    }
    return ''
  }

  private ComputeTabSubTitle(tab: string, item: Song | Album | Artists | Genre | Playlist) {
    if (item) {
      switch (tab) {
        case 'Spotify':
        case 'Youtube':
        case 'Songs':
        default:
          return (item as Song).artists?.map((val) => val.artist_name).join(', ')
        case 'Albums':
          return `${(item as Album).album_song_count} Songs`
        case 'Artists':
          return (item as Artists).artist_song_count ? `${(item as Artists).artist_song_count} Songs` : ''
        case 'Genres':
          return `${(item as Genre).genre_song_count} Songs`
        case 'Playlists':
          return `${(item as Playlist).playlist_song_count} Songs`
      }
    }
    return ''
  }

  private ComputeTabImage(tab: string, item: Song | Album | Artists | Genre | Playlist) {
    if (item) {
      switch (tab) {
        case 'Spotify':
        case 'Youtube':
        case 'Songs':
        default:
          return this.getValidImageLow(item as Song) ?? this.getValidImageHigh(item as Song)
        case 'Albums':
          return (item as Album).album_coverPath_low ?? (item as Album).album_coverPath_high
        case 'Artists':
          return (item as Artists).artist_coverPath
        case 'Genres':
          return ''
        case 'Playlists':
          return (item as Playlist).playlist_coverPath
      }
    }
    return ''
  }

  private titleClickHandler(tab: string, item: Album | Artists | Genre | Playlist) {
    switch (tab) {
      case 'Songs':
      case 'Spotify':
      case 'Youtube':
      default:
        // TODO: Redirect to a seperate page with song details
        return
      case 'Albums':
        this.gotoAlbum(item as Album)
        return
      case 'Artists':
        this.gotoArtist(item as Artists)
        return
      case 'Genres':
        this.gotoGenre(item as Genre)
        return ''
      case 'Playlists':
        this.gotoPlaylist(item as Playlist)
        return
    }
  }

  private imgClickHandler(tab: string, item: Song | Album | Artists | Genre | Playlist) {
    switch (tab) {
      case 'Songs':
      case 'Spotify':
      case 'Youtube':
      default:
        this.playTop([item as Song])
        return
      case 'Albums':
        this.playAlbum(item as Album)
        return
      case 'Artists':
        this.playArtist(item as Artists)
        return
      case 'Genres':
        this.playGenre(item as Genre)
        return ''
      case 'Playlists':
        this.playPlaylist(item as Playlist)
        return
    }
  }

  private contextMenuHandler(tab: string, event: Event, item: Song) {
    switch (tab) {
      case 'Youtube':
      case 'Songs':
      case 'Spotify':
      default:
        this.getContextMenu(event, {
          type: 'SONGS',
          args: { songs: [item as Song], isRemote: tab !== 'Songs' }
        })
        break
      case 'Albums':
      case 'Artists':
      case 'Genres':
      case 'Playlists':
        break
    }
  }

  private async playAlbum(item: Album) {
    let songs = await window.SearchUtils.searchSongsByOptions({
      album: {
        album_id: item.album_id
      }
    })
    songs.forEach((value) => {
      this.queueSong([value])
    })
  }

  private async playArtist(item: Artists) {
    let songs = await window.SearchUtils.searchSongsByOptions({
      artist: {
        artist_id: item.artist_id
      }
    })
    songs.forEach((value) => {
      this.queueSong([value])
    })
  }

  private async playGenre(item: Genre) {
    let songs = await window.SearchUtils.searchSongsByOptions({
      genre: {
        genre_id: item.genre_id
      }
    })
    songs.forEach((value) => {
      this.queueSong([value])
    })
  }

  private async playPlaylist(item: Playlist) {
    let songs = await window.SearchUtils.searchSongsByOptions({
      playlist: {
        playlist_id: item.playlist_id
      }
    })
    songs.forEach((value) => {
      this.queueSong([value])
    })
  }

  created() {
    this.term = this.$route.query['search_term'] as string
    this.fetchData()
  }

  @Watch('$route.query.search_term')
  @Watch('$route.query.timestamp')
  onTermChanged() {
    if (this.$route.query.search_term) {
      this.term = this.$route.query.search_term as string
      this.result = {}
      this.fetchData()

      for (const k of Object.keys(this.loadedMore)) {
        this.loadedMore[k] = false
      }
    }
  }
}
</script>

<style lang="sass">
.tab-inner-container
  height: calc(100% - 58px)

.tab-outer-container
  padding-top: 15px
  overflow-y: scroll

.nothing-found
  font-size: 22px
  font-weight: 700

.tab-pane
  height: 100%

.load-more
  background-color: var(--accent)
  color: var(--textInverse)

.spinner
</style>
