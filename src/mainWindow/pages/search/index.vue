<!-- 
  index.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-container class="h-100">
    <TabCarousel
      :items="searchItems"
      :showExtraSongListActions="false"
      :singleSelectMode="true"
      :defaultSelected="searchItems[0].key"
      :showBackgroundOnSelect="true"
      @onItemsChanged="onProviderChanged"
    />

    <TabCarousel
      :items="subCategories"
      :showExtraSongListActions="false"
      :singleSelectMode="true"
      :defaultSelected="subCategories[0].key"
      :showBackgroundOnSelect="true"
      @onItemsChanged="onSubcategoriesChanged"
    />

    <div v-if="!isFetching">
      <transition
        appear
        name="custom-slide-fade"
        :enter-active-class="`animate__animated ${transitionEnterActiveClass} animate__fast`"
        :leave-active-class="`animate__animated ${transitionExitActiveClass} animate__fast`"
      >
        <b-row
          class="scroller-row w-100"
          v-if="activeSubcategory === 'songs'"
          :key="`${activeProvider}-${activeSubcategory}`"
        >
          <b-col class="h-100">
            <RecycleScroller
              class="scroller w-100 h-100"
              :items="currentSongList"
              :item-size="94"
              key-field="_id"
              :direction="'vertical'"
            >
              <template v-slot="{ item, index }">
                <SongListCompactItem
                  :item="item"
                  :index="index"
                  :selected="selected"
                  @onRowDoubleClicked="queueSong([arguments[0]])"
                  @onRowSelected="onRowSelected"
                  @onRowContext="onRowContext"
                  @onPlayNowClicked="playTop([arguments[0]])"
                  @onArtistClicked="gotoArtist"
                />
              </template>
            </RecycleScroller>
          </b-col>
        </b-row>

        <b-row class="scroller-row w-100" v-else :key="`${activeProvider}-${activeSubcategory}`">
          <b-col col xl="2" md="3" v-for="entity in currentEntityList" :key="entity[entityKeyField]">
            <CardView
              @click.native="onCardClick(entity)"
              :title="entity[entityTitleField]"
              :imgSrc="entity[entityImageField]"
            >
              <template #defaultCover> <component :is="defaultCoverComponent" /></template>
            </CardView>
          </b-col>
        </b-row>
      </transition>
    </div>
    <div v-else>
      <b-spinner label="Loading..."></b-spinner>
    </div>
    <div v-if="noResults" class="no-results">{{ noResultsReason }}</div>
  </b-container>
</template>

<script lang="ts">
import { vxm } from '@/mainWindow/store'
import { Component, Vue, Watch } from 'vue-property-decorator'
import TabCarousel from '@/mainWindow/components/generic/TabCarousel.vue'
import { GenericProvider } from '@/utils/ui/providers/generics/genericProvider'
import SongListCompactItem from '@/mainWindow/components/songView/components/SongListCompactItem.vue'
import CardView from '@/mainWindow/components/generic/CardView.vue'
import ArtistDefault from '@/icons/ArtistDefaultIcon.vue'
import AlbumDefault from '@/icons/AlbumDefaultIcon.vue'
import PlaylistDefault from '@/icons/PlaylistDefaultIcon.vue'
import GenreDefault from '@/icons/SongDefaultIcon.vue'
import { mixins } from 'vue-class-component'
import PlayerControls from '@/utils/ui/mixins/PlayerControls'
import SongListMixin from '@/utils/ui/mixins/SongListMixin'
import ContextMenuMixin from '@/utils/ui/mixins/ContextMenuMixin'
import RouterPushes from '@/utils/ui/mixins/RouterPushes'

@Component({
  components: {
    TabCarousel,
    SongListCompactItem,
    CardView,
    ArtistDefault,
    AlbumDefault,
    PlaylistDefault,
    GenreDefault
  }
})
export default class SearchPage extends mixins(PlayerControls, SongListMixin, ContextMenuMixin, RouterPushes) {
  private optionalProviders: TabCarouselItem[] = []
  private activeProvider = ''
  private activeSubcategory: keyof SearchResult = 'songs'
  private oldSubcategory = this.activeSubcategory

  private fetchMap: Record<string, boolean> = {}

  private get isFetching() {
    return this.fetchMap[this.activeProvider]
  }

  private get noResultsReason() {
    if (this.activeProvider === vxm.providers.youtubeProvider.key) {
      if (!vxm.providers.loggedInYoutube) {
        return 'Login to Youtube to use this feature'
      }

      if (vxm.providers.useInvidious) {
        if (this.activeSubcategory !== 'songs') {
          return 'Searching artists, playlists and albums is currently not supported using Invidious'
        }
      }
    }

    if (this.activeProvider === vxm.providers.spotifyProvider.key && !vxm.providers.loggedInSpotify) {
      return 'Login to Spotify to use this feature'
    }

    if (this.activeProvider !== 'local') {
      return 'You might need to login with the extension to use this feature'
    }

    return 'Nothing found'
  }

  private get noResults() {
    if (!this.isFetching) {
      if (this.activeSubcategory === 'songs') {
        return this.currentSongList.length === 0
      }
      return this.currentEntityList.length === 0
    }
    return false
  }

  private get defaultCoverComponent() {
    switch (this.activeSubcategory) {
      case 'artists':
        return 'ArtistDefault'
      case 'playlists':
        return 'PlaylistDefault'
      case 'albums':
        return 'AlbumDefault'
      case 'genres':
      default:
        return 'GenreDefault'
    }
  }

  private get searchItems(): TabCarouselItem[] {
    return [
      {
        title: 'Local',
        key: 'local'
      },
      {
        title: 'Youtube',
        key: vxm.providers.youtubeProvider.key
      },
      {
        title: 'Spotify',
        key: vxm.providers.spotifyProvider.key
      },
      ...this.optionalProviders
    ]
  }

  private get subCategories(): TabCarouselItem[] {
    return [
      {
        title: 'Songs',
        key: 'songs'
      },
      {
        title: 'Artists',
        key: 'artists'
      },
      {
        title: 'Playlists',
        key: 'playlists'
      },
      {
        title: 'Albums',
        key: 'albums'
      }
    ]
  }

  private get currentSongList() {
    if (this.activeProvider) {
      return this.results[this.activeProvider]?.songs ?? []
    }

    return []
  }

  private get currentEntityList() {
    if (this.activeProvider) {
      const providerResults = this.results[this.activeProvider]
      if (providerResults) {
        return providerResults[this.activeSubcategory] ?? []
      }
    }
    return []
  }

  private get entityKeyField() {
    switch (this.activeSubcategory) {
      default:
      case 'songs':
        return '_id'
      case 'artists':
        return 'artist_id'
      case 'playlists':
        return 'playlist_id'
      case 'albums':
        return 'album_id'
      case 'genres':
        return 'genre_id'
    }
  }

  private get entityTitleField() {
    switch (this.activeSubcategory) {
      default:
      case 'songs':
        return 'title'
      case 'artists':
        return 'artist_name'
      case 'playlists':
        return 'playlist_name'
      case 'albums':
        return 'album_name'
      case 'genres':
        return 'genre_name'
    }
  }

  private get entityImageField() {
    switch (this.activeSubcategory) {
      default:
      case 'songs':
        return 'song_coverPath_high'
      case 'artists':
        return 'artist_coverPath'
      case 'playlists':
        return 'playlist_coverPath'
      case 'albums':
        return 'album_coverPath_high'
      case 'genres':
        return 'genre_coverPath'
    }
  }

  private transitionEnterActiveClass = 'animate__slideInLeft'
  private transitionExitActiveClass = 'animate__slideOutLeft'

  private results: Record<string, SearchResult> = {}

  private get searchTerm() {
    return this.$route.query.search_term as string
  }

  @Watch('searchTerm', { immediate: true })
  private onSearchTermChanged() {
    this.fetchLocalSongList()
    this.fetchProviderSongList(vxm.providers.youtubeProvider)
    this.fetchProviderSongList(vxm.providers.spotifyProvider)
    this.fetchExtensionSongList()
  }

  private async fetchLocalSongList() {
    Vue.set(this.fetchMap, 'local', true)
    Vue.set(this.results, 'local', await window.SearchUtils.searchAll(`%${this.searchTerm}%`))
    Vue.set(this.fetchMap, 'local', false)
  }

  private async fetchProviderSongList(provider: GenericProvider) {
    Vue.set(this.fetchMap, provider.key, true)

    Vue.set(this.results, provider.key, {
      songs: await provider.searchSongs(this.searchTerm),
      artists: await provider.searchArtists(this.searchTerm),
      playlists: await provider.searchPlaylists(this.searchTerm),
      albums: await provider.searchAlbum(this.searchTerm),
      genres: []
    })
    Vue.set(this.fetchMap, provider.key, false)
  }

  private async fetchExtensionSongList() {
    for (const p of this.optionalProviders) {
      Vue.set(this.fetchMap, p.key, true)

      window.ExtensionUtils.sendEvent({
        type: 'requestedSearchResult',
        data: [this.searchTerm],
        packageName: p.key
      }).then((data) => {
        if (data && data[p.key]) {
          Vue.set(this.results, p.key, {
            songs: data[p.key]?.songs,
            artists: data[p.key]?.artists,
            playlists: data[p.key]?.playlists,
            albums: data[p.key]?.albums,
            genre: []
          })
        }
        Vue.set(this.fetchMap, p.key, false)
      })
    }
  }

  private onProviderChanged({ key, checked }: { key: string; checked: boolean }) {
    if (checked) this.activeProvider = key
  }

  private onSubcategoriesChanged({ key, checked }: { key: string; checked: boolean }) {
    if (checked) {
      this.activeSubcategory = key as keyof SearchResult

      const oldIndex = this.subCategories.findIndex((val) => val.key === this.oldSubcategory)
      const newIndex = this.subCategories.findIndex((val) => val.key === this.activeSubcategory)

      this.oldSubcategory = this.activeSubcategory

      if (oldIndex < newIndex) {
        this.transitionEnterActiveClass = 'animate__slideInRight'
        this.transitionExitActiveClass = 'animate__slideOutLeft'
      } else {
        this.transitionEnterActiveClass = 'animate__slideInLeft'
        this.transitionExitActiveClass = 'animate__slideOutRight'
      }
    }
  }

  private async fetchSearchProviders() {
    const providers = await window.ExtensionUtils.getRegisteredSearchProviders()
    for (const [key, value] of Object.entries(providers)) {
      this.optionalProviders.push({ title: value, key })
    }
    await this.fetchExtensionSongList()
  }

  mounted() {
    this.fetchSearchProviders()
  }

  private onRowContext(event: PointerEvent, item: Song) {
    this.getContextMenu(event, {
      type: 'SONGS',
      args: { songs: [item], isRemote: this.activeProvider !== 'local' }
    })
  }

  private onCardClick(item: typeof this.currentEntityList[0]) {
    switch (this.activeSubcategory) {
      case 'artists':
        this.gotoArtist(item as Artists)
        break
      case 'playlists':
        this.gotoPlaylist(item as Playlist)
        break
      case 'albums':
        this.gotoAlbum(item as Album)
        break
      case 'genres':
        this.gotoGenre(item as Genre)
        break
    }
  }
}
</script>

<style lang="sass">
.scroller-row
  position: absolute
  height: calc(100% - 140px)
  overflow: auto

.no-results
  font-size: 18px
  margin-top: 35px
</style>
