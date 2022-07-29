/*
 *  youtube.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { GenericProvider } from '@/utils/ui/providers/generics/genericProvider'

import { GenericAuth } from './generics/genericAuth'
import { GenericRecommendation } from './generics/genericRecommendations'

import { bus } from '@/mainWindow/main'
import { EventBus } from '@/utils/main/ipc/constants'
import { InvidiousApiResources } from '@/utils/commonConstants'

const KeytarService = 'MoosyncInvidiousToken'

export class InvidiousProvider extends GenericAuth implements GenericProvider, GenericRecommendation {
  private _token: string | undefined
  private oAuthChannel: string | undefined

  public get key() {
    return 'youtube'
  }

  public async updateConfig(): Promise<boolean> {
    const AUTH_BASE_URL = await window.PreferenceUtils.loadSelective('invidious_instance')
    this._token = (await this.fetchStoredToken()) ?? undefined
    return !!AUTH_BASE_URL
  }

  private async fetchStoredToken() {
    return window.Store.getSecure(KeytarService)
  }

  private async populateRequest<K extends InvidiousResponses.InvidiousApiResources>(
    resource: K,
    search: InvidiousResponses.SearchObject<K>,
    invalidateCache = false
  ) {
    return window.SearchUtils.requestInvidious(resource, search, this._token, invalidateCache)
  }

  public async getLoggedIn() {
    return !!this._token
  }

  public async login() {
    if (!(await this.getLoggedIn())) {
      if (!this.oAuthChannel) {
        this.oAuthChannel = await window.WindowUtils.registerOAuthCallback('invidiousCallback')
      }

      const AUTH_BASE_URL = await window.PreferenceUtils.loadSelective('invidious_instance')
      if (AUTH_BASE_URL) {
        const resp = await new Promise<boolean>((resolve) => {
          window.WindowUtils.listenOAuth(this.oAuthChannel as string, async (data) => {
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

          bus.$emit(EventBus.SHOW_OAUTH_MODAL, {
            providerName: 'Invidious',
            url: AUTH_BASE_URL + '/authorize_token?scopes=:*&callback_url=https://moosync.app/invidious&expire=360000',
            providerColor: '#E62017',
            oauthPath: 'invidiousCallback'
          } as LoginModalOptions)

          window.WindowUtils.openExternal(
            AUTH_BASE_URL + '/authorize_token?scopes=:*&callback_url=https://moosync.app/invidious'
          )
        })

        bus.$emit(EventBus.HIDE_OAUTH_MODAL)
        return resp
      }
      return false
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

  private parsePlaylists(items: InvidiousResponses.UserPlaylists.PlaylistResponse[]): ExtendedPlaylist[] {
    const playlists: ExtendedPlaylist[] = []
    for (const p of items) {
      playlists.push({
        playlist_id: `youtube:${p.playlistId}`,
        playlist_name: p.title,
        playlist_song_count: p.videoCount,
        playlist_coverPath: p.videos[0]?.videoThumbnails[0]?.url ?? '',
        isRemote: true
      })
    }
    return playlists
  }

  public async getUserPlaylists(invalidateCache = false) {
    const resp = await this.populateRequest(InvidiousApiResources.PLAYLISTS, { params: undefined }, invalidateCache)
    return this.parsePlaylists(resp ?? [])
  }

  private parsePlaylistItems(items: InvidiousResponses.UserPlaylists.PlaylistResponse['videos']): InvidiousSong[] {
    const songs: InvidiousSong[] = []
    for (const s of items) {
      const stream = (s as InvidiousResponses.VideoDetails.VideoResponse).formatStreams?.slice(-1).pop()
      songs.push({
        _id: `youtube:${s.videoId}`,
        title: s.title,
        duration: s.lengthSeconds,
        artists: [
          {
            artist_id: `youtube-author:${s.authorId}`,
            artist_name: s.author
          }
        ],
        date_added: Date.now(),
        song_coverPath_high: s.videoThumbnails?.find((val) => val.quality.includes('maxres'))?.url,
        song_coverPath_low: s.videoThumbnails?.find((val) => val.quality.includes('medium'))?.url,
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
    const resp = await this.populateRequest(
      InvidiousApiResources.PLAYLIST_ITEMS,
      { params: { playlist_id } },
      invalidateCache
    )
    yield this.parsePlaylistItems(resp?.videos ?? [])
  }

  public async getPlaybackUrlAndDuration(song: InvidiousSong) {
    if (song.url) return { url: song.invidiousPlaybackUrl ?? song.url, duration: song.duration }
  }

  public async getPlaylistDetails(url: string, invalidateCache = false) {
    const playlist_id = this.getIDFromURL(url)
    if (playlist_id) {
      const resp = await this.populateRequest(
        InvidiousApiResources.PLAYLIST_ITEMS,
        { params: { playlist_id } },
        invalidateCache
      )
      if (resp) {
        const playlists = this.parsePlaylists([resp])
        if (playlists.length > 0) {
          return playlists[0]
        }
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
        InvidiousApiResources.VIDEO_DETAILS,
        { params: { video_id: videoID } },
        invalidateCache
      )

      if (resp) return this.parseSong(resp)
    }

    return
  }

  public async *getRecommendations(): AsyncGenerator<Song[]> {
    const resp = await this.populateRequest(InvidiousApiResources.TRENDING, { params: { type: 'music' } }, false)
    if (resp) yield this.parsePlaylistItems([resp])
  }

  public async *getArtistSongs(): AsyncGenerator<Song[]> {
    yield []
  }

  public async searchSongs(term: string): Promise<Song[]> {
    const resp = await this.populateRequest(InvidiousApiResources.SEARCH, {
      params: {
        q: term,
        type: 'video',
        sort_by: 'relevance'
      }
    })

    if (resp) return this.parsePlaylistItems(resp)
    return []
  }

  // TODO: Fetch artist details from invidious
  public async getArtistDetails(artist: Artists): Promise<Artists | undefined> {
    return
  }

  public async searchArtists(term: string): Promise<Artists[]> {
    return []
  }

  public async searchPlaylists(term: string): Promise<Playlist[]> {
    return []
  }

  public async searchAlbum(term: string): Promise<Album[]> {
    return []
  }
}
