/*
 *  youtube.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { GenericProvider, cache } from '@/utils/ui/providers/generics/genericProvider'

import { GenericAuth } from './generics/genericAuth'
import { GenericRecommendation } from './generics/genericRecommendations'
import axios from 'axios'
import qs from 'qs'
import { Song } from '@moosync/moosync-types'
import { bus } from '@/mainWindow/main'
import { EventBus } from '@/utils/main/ipc/constants'

const BASE_URL = 'https://invidio.xamh.de/api/v1/'
const AUTH_BASE_URL = 'https://invidio.xamh.de/'
const KeytarService = 'MoosyncInvidiousToken'

enum ApiResources {
  PLAYLISTS = 'auth/playlists',
  PLAYLIST_ITEMS = 'playlists/{playlist_id}',
  VIDEO_DETAILS = 'videos/{video_id}',
  TRENDING = 'trending',
  SEARCH = 'search'
}

export class InvidiousProvider extends GenericAuth implements GenericProvider, GenericRecommendation {
  private _token: string | undefined
  private oAuthChannel: string | undefined

  public async updateConfig(): Promise<boolean> {
    this._token = (await this.fetchStoredToken()) ?? undefined
    return true
  }

  private async fetchStoredToken() {
    return window.Store.getSecure(KeytarService)
  }

  private api = axios.create({
    adapter: cache.adapter,
    baseURL: BASE_URL,
    paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' })
  })

  private async populateRequest<K extends ApiResources>(
    resource: K,
    search: InvidiousResponses.SearchObject<K>,
    invalidateCache = false
  ) {
    return window.SearchUtils.requestInvidious(resource, search, this._token, invalidateCache)
  }

  public get loggedIn() {
    return !!this._token
  }

  public async login() {
    if (!this.loggedIn) {
      if (!this.oAuthChannel) {
        this.oAuthChannel = await window.WindowUtils.registerOAuthCallback('invidiousCallback')
      }

      const resp = await new Promise<boolean>((resolve) => {
        window.WindowUtils.listenOAuth(this.oAuthChannel as string, async (data) => {
          console.log(data)
          const url = new URL(data)
          const session = decodeURIComponent(url.searchParams.get('token') ?? '')
          if (session) {
            try {
              this._token = session
              if (this._token) {
                window.Store.setSecure(KeytarService, this._token).then(() => {
                  resolve(true)
                })
                return
              }
            } catch (e) {
              console.error(e)
              resolve(false)
            }
          }
        })

        bus.$emit(
          EventBus.SHOW_OAUTH_MODAL,
          'Invidious',
          AUTH_BASE_URL + 'authorize_token?scopes=:*&callback_url=https://moosync.app/invidious&expire=360000',
          '#E62017'
        )

        window.WindowUtils.openExternal(
          AUTH_BASE_URL + 'authorize_token?scopes=:*&callback_url=https://moosync.app/invidious'
        )
      })

      bus.$emit(EventBus.HIDE_OAUTH_MODAL)
      return resp
    }
    return true
  }

  public async signOut() {
    await window.Store.removeSecure(KeytarService)
    this._token = undefined
  }

  public async getUserDetails(): Promise<string | undefined> {
    if (this._token) return 'Anonymous'
  }

  private parsePlaylists(items: InvidiousResponses.UserPlaylists.PlaylistResponse[]): Playlist[] {
    const playlists: Playlist[] = []
    for (const p of items) {
      playlists.push({
        playlist_id: `youtube-${p.playlistId}`,
        playlist_name: p.title,
        playlist_song_count: p.videoCount,
        playlist_coverPath: p.videos[0]?.videoThumbnails[0]?.url ?? '',
        isRemote: true
      })
    }
    return playlists
  }

  public async getUserPlaylists(invalidateCache = false) {
    const resp = await this.populateRequest(ApiResources.PLAYLISTS, { params: undefined }, invalidateCache)
    return this.parsePlaylists(resp)
  }

  private parsePlaylistItems(items: InvidiousResponses.UserPlaylists.PlaylistResponse['videos']): InvidiousSong[] {
    const songs: InvidiousSong[] = []
    for (const s of items) {
      const stream = (s as InvidiousResponses.VideoDetails.VideoResponse).formatStreams?.slice(-1).pop()
      songs.push({
        _id: s.videoId,
        title: s.title,
        duration: s.lengthSeconds,
        artists: [s.author],
        date_added: Date.now(),
        song_coverPath_high: s.videoThumbnails.find((val) => val.quality.includes('maxres'))?.url,
        song_coverPath_low: s.videoThumbnails.find((val) => val.quality.includes('medium'))?.url,
        url: s.videoId,
        playbackUrl: '',
        invidiousPlaybackUrl: stream?.url ?? '',
        type: 'YOUTUBE'
      })
    }
    return songs
  }

  public matchPlaylist(url: string) {
    return !!(
      url.match(
        /^((?:https?:)?\/\/)?((?:www|m|music)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/
      ) ?? this.getIDFromURL(url)
    )
  }

  private getIDFromURL(url: string) {
    try {
      return new URL(url)?.searchParams?.get('list') ?? undefined
    } catch (e) {
      console.debug('Tried parsing', url, 'as invidious playlist but failed')
    }
  }

  public async *getPlaylistContent(str: string, invalidateCache = false): AsyncGenerator<Song[]> {
    const playlist_id = this.getIDFromURL(str) ?? str
    const resp = await this.populateRequest(ApiResources.PLAYLIST_ITEMS, { params: { playlist_id } }, invalidateCache)
    yield this.parsePlaylistItems(resp.videos ?? [])
  }

  public async getPlaybackUrlAndDuration(song: InvidiousSong) {
    if (song.url) return { url: song.invidiousPlaybackUrl ?? song.url, duration: song.duration }
  }

  public async getPlaylistDetails(url: string, invalidateCache = false) {
    const playlist_id = this.getIDFromURL(url)
    if (playlist_id) {
      const resp = await this.populateRequest(ApiResources.PLAYLIST_ITEMS, { params: { playlist_id } }, invalidateCache)
      const playlists = this.parsePlaylists([resp])
      if (playlists.length > 0) {
        return playlists[0]
      }
    }
  }

  private parseSong(item: InvidiousResponses.VideoDetails.VideoResponse): Song {
    return this.parsePlaylistItems([item])[0]
  }

  public async getSongDetails(url: string, invalidateCache = false): Promise<Song | undefined> {
    const parsedUrl = new URL(url)
    const videoID = parsedUrl.searchParams.get('v')

    if (videoID) {
      const resp = await this.populateRequest(
        ApiResources.VIDEO_DETAILS,
        { params: { video_id: videoID } },
        invalidateCache
      )

      return this.parseSong(resp)
    }

    return
  }

  public async *getRecommendations(): AsyncGenerator<Song[]> {
    const resp = await this.populateRequest(ApiResources.TRENDING, { params: { type: 'music' } }, false)
    yield this.parsePlaylistItems([resp])
  }

  public async *getArtistSongs(): AsyncGenerator<Song[]> {
    yield []
  }
}
