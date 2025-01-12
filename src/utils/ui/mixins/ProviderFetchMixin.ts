import Component from 'vue-class-component'
import Vue from 'vue'
import { GenericProvider } from '../providers/generics/genericProvider'
import { mixins } from 'vue-class-component'
import { vxm } from '@/mainWindow/store'
import ProviderMixin from './ProviderMixin'

@Component
export default class ProviderFetchMixin extends mixins(ProviderMixin) {
  private loadingMap: Record<string, boolean> = {}
  private songList: Song[] = []
  generator:
    | ((
        provider: GenericProvider,
        nextPageToken: unknown
      ) => AsyncGenerator<{
        songs: Song[]
        nextPageToken?: unknown
      }>)
    | undefined = undefined

  localSongFetch: ((sortBy: SongSortOptions[]) => Promise<Song[]>) | undefined

  optionalSongList: Record<string, string[]> = {}

  activeProviders: Record<string, boolean> = {
    local: true
  }

  private nextPageToken: Record<string, unknown> = {}

  get filteredSongList() {
    return this.songList.filter((val) => {
      for (const [key, value] of Object.entries(this.activeProviders)) {
        if (this.optionalSongList[key]) {
          if (value) {
            if (this.optionalSongList[key].includes(val._id)) return true
          }
        }
      }
      return false
    })
  }

  get isLoading() {
    return Object.values(this.loadingMap).includes(true)
  }

  private async fetchProviderSonglist(provider: GenericProvider) {
    Vue.set(this.loadingMap, provider.key, true)
    if (this.generator) {
      for await (const items of this.generator(provider, this.nextPageToken[provider.key])) {
        this.nextPageToken[provider.key] = items.nextPageToken
        for (const s of items.songs) {
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

    Vue.set(this.loadingMap, provider.key, false)
  }

  private isFetching = false

  async fetchSongList() {
    Vue.set(this.loadingMap, 'local', true)
    this.songList = (await this.localSongFetch?.(vxm.themes.songSortBy)) ?? []
    Vue.set(
      this.optionalSongList,
      'local',
      this.songList.map((val) => val._id)
    )
    Vue.set(this.loadingMap, 'local', false)
  }

  public async fetchAll(afterFetch?: (songs: Song[]) => void) {
    if (!this.isFetching) {
      this.isFetching = true
      let songListLastSong = this.songList.length - 1

      for (const key of Object.keys(this.nextPageToken)) {
        while (this.nextPageToken[key]) {
          await this.loadNextPage()
          afterFetch && afterFetch(this.songList.slice(songListLastSong))
          songListLastSong = this.songList.length
        }
      }
      this.isFetching = false
    }
  }

  async loadNextPage() {
    for (const key of Object.keys(this.nextPageToken)) {
      if (this.nextPageToken[key]) {
        for (const [key, checked] of Object.entries(this.activeProviders)) {
          if (checked) {
            await this.fetchRemoteProviderByKey(key)
          }
        }
      }
    }
  }

  private async fetchRemoteProviderByKey(key: string) {
    const provider = this.getProviderByKey(key)
    if (provider) {
      await this.fetchProviderSonglist(provider)
      return
    }
  }

  onProviderChanged({ key, checked }: { key: string; checked: boolean }) {
    Vue.set(this.activeProviders, key, checked)
    if (checked) {
      this.fetchRemoteProviderByKey(key)
    }
  }

  clearSongList() {
    this.songList = []
  }

  clearNextPageTokens() {
    this.nextPageToken = {}
  }
}
