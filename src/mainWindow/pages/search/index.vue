<!-- 
  index.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div class="w-100 h-100 tab-outer-container">
    <b-tabs content-class="mt-3 tab-inner-container" justified v-model="tabModel" class="h-100">
      <b-tab :title="i.tab" v-for="i in items" :id="i.tab" :key="i.key">
        <RecycleScroller
          class="scroller"
          :items="ComputeTabContent(i.tab)"
          :item-size="80"
          :key-field="ComputeTabKeyField(i.tab)"
          v-slot="{ item, index }"
          v-if="result"
          :direction="'vertical'"
        >
          <SingleSearchResult
            :title="ComputeTabTitle(tab, item)"
            :subtitle="ComputeTabSubTitle(tab, item)"
            :coverImg="ComputeTabImage(tab, item)"
            :divider="index != result.songs.length - 1"
            :id="item"
            :showButtons="true"
            @imgClick="imgClickHandler(tab, $event)"
            @titleClick="titleClickHandler(tab, $event)"
            @onContextMenu="contextMenuHandler(tab, ...arguments)"
          />
        </RecycleScroller>
        <b-button v-if="getLoadMore(tab)" @click="handleLoadMore(tab)">Load more from spotify</b-button>
      </b-tab>
    </b-tabs>
  </div>
</template>

<script lang="ts">
import { Component, Watch } from 'vue-property-decorator'
import SingleSearchResult from '@/mainWindow/components/generic/SingleSearchResult.vue'
import { mixins } from 'vue-class-component'
import RouterPushes from '@/utils/ui/mixins/RouterPushes'
import { toSong } from '@/utils/models/youtube'
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
  private tabModel = 0
  private result: SearchResult = {}
  private items = [
    { tab: 'Songs', count: 0, key: 'Songs-0' },
    { tab: 'Albums', count: 0, key: 'Albums-0' },
    { tab: 'Artists', count: 0, key: 'Artists-0' },
    { tab: 'Genres', count: 0, key: 'Genres-0' },
    { tab: 'Playlists', count: 0, key: 'Playlists-0' },
    { tab: 'Youtube', count: 0, key: 'Youtube-0' },
    { tab: 'Spotify', count: 0, key: 'Spotify-0' }
  ]

  get tab() {
    return this.items[this.tabModel].tab
  }

  private async fetchData() {
    this.result = await window.SearchUtils.searchAll(this.term)
    this.refreshLocal()

    this.result.youtube = await window.SearchUtils.searchYT(this.term)
    this.refreshYoutube()

    if (vxm.providers.loggedInSpotify) {
      this.result.spotify = await vxm.providers.spotifyProvider.searchSongs(this.term)
      this.refreshSpotify()
    }
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

  private getLoadMore(tab: string) {
    if (tab === 'Artists') return true
    return false
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
      }
    }
  }

  private ComputeTabKeyField(tab: string) {
    switch (tab) {
      case 'Songs':
      case 'Spotify':
        return '_id'
      case 'Albums':
        return 'album_id'
      case 'Artists':
        return 'artist_id'
      case 'Genres':
        return 'genre_id'
      case 'Playlists':
        return 'playlist_id'
      case 'Youtube':
        return 'youtubeId'
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
      }
    }
    return []
  }

  private ComputeTabTitle(tab: string, item: Song | Album | Artists | Genre | Playlist) {
    if (item) {
      switch (tab) {
        case 'Spotify':
        case 'Songs':
          return (item as Song).title
        case 'Albums':
          return (item as Album).album_name
        case 'Artists':
          return (item as Artists).artist_name
        case 'Genres':
          return (item as Genre).genre_name
        case 'Playlists':
          return (item as Playlist).playlist_name
        case 'Youtube':
          return (item as YTMusicVideo).title
      }
    }
    return ''
  }

  private ComputeTabSubTitle(tab: string, item: Song | Album | Artists | Genre | Playlist) {
    if (item) {
      switch (tab) {
        case 'Spotify':
        case 'Songs':
          return (item as Song).artists?.join(', ')
        case 'Albums':
          return `${(item as Album).album_song_count} Songs`
        case 'Artists':
          return (item as Artists).artist_song_count ? `${(item as Artists).artist_song_count} Songs` : ''
        case 'Genres':
          return `${(item as Genre).genre_song_count} Songs`
        case 'Playlists':
          return `${(item as Playlist).playlist_song_count} Songs`
        case 'Youtube':
          return `${(item as YTMusicVideo).album} - ${(item as YTMusicVideo).artists
            ?.map((val) => val.name)
            ?.join(', ')}`
      }
    }
    return ''
  }

  private ComputeTabImage(tab: string, item: Song | Album | Artists | Genre | Playlist) {
    if (item) {
      switch (tab) {
        case 'Spotify':
        case 'Songs':
          return this.getValidImageLow(item as Song) ?? this.getValidImageHigh(item as Song)
        case 'Albums':
          return (item as Album).album_coverPath_low ?? (item as Album).album_coverPath_high
        case 'Artists':
          return (item as Artists).artist_coverPath
        case 'Genres':
          return ''
        case 'Playlists':
          return (item as Playlist).playlist_coverPath
        case 'Youtube':
          return (item as YTMusicVideo).thumbnailUrl
      }
    }
    return ''
  }

  private titleClickHandler(tab: string, item: Album | Artists | Genre | Playlist) {
    switch (tab) {
      case 'Songs':
      case 'Spotify':
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

  private imgClickHandler(tab: string, item: Song | Album | Artists | Genre | Playlist | YTMusicVideo) {
    switch (tab) {
      case 'Songs':
      case 'Spotify':
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
      case 'Youtube':
        this.playTop(toSong(item as YTMusicVideo))
    }
  }

  private contextMenuHandler(tab: string, event: Event, item: Song | YTMusicVideo) {
    switch (tab) {
      case 'Youtube':
        this.getContextMenu(event, { type: 'YOUTUBE', args: { ytItems: [item as YTMusicVideo] } })
        break
      case 'Songs':
      case 'Spotify':
        this.getContextMenu(event, { type: 'SONGS', args: { songs: [item as Song] } })
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

  @Watch('$route.query.search_term') onTermChanged(newValue: string) {
    this.term = newValue
    this.fetchData()
  }
}
</script>

<style lang="sass">
.tab-inner-container
  overflow-y: scroll
  height: calc(100% - 58px)

.tab-outer-container
  padding-top: 15px
  overflow-y: scroll
</style>
