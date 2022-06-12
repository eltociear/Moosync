/*
 *  spotify.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { AuthFlow, AuthStateEmitter } from '@/utils/ui/oauth/flow'
import { GenericProvider, cache } from '@/utils/ui/providers/generics/genericProvider'

import { AuthorizationServiceConfiguration } from '@openid/appauth'
import { GenericAuth } from './generics/genericAuth'
import { GenericRecommendation } from './generics/genericRecommendations'
import axios from 'axios'
import { once } from 'events'
import qs from 'qs'
import { vxm } from '@/mainWindow/store'
import { bus } from '@/mainWindow/main'
import { EventBus } from '@/utils/main/ipc/constants'
import { GenericSearch } from './generics/genericSearch'

/**
 * Spotify API base URL
 */
const BASE_URL = 'https://api.spotify.com/v1/'

enum ApiResources {
  USER_DETAILS = 'me',
  LIKED_SONGS = 'me/tracks',
  PLAYLISTS = 'me/playlists',
  PLAYLIST = 'playlists/{playlist_id}',
  PLAYLIST_ITEMS = 'playlists/{playlist_id}/tracks',
  SONG_DETAILS = 'tracks/{song_id}',
  TOP = 'me/top/{type}',
  RECOMMENDATIONS = 'recommendations',
  SEARCH = 'search',
  ARTIST_TOP = 'artists/{artist_id}/top-tracks',
  ARTIST_ALBUMS = 'artists/{artist_id}/albums',
  ALBUM_SONGS = 'albums/{album_id}/tracks'
}

/**
 * API Handler for Spotify.
 */
export class SpotifyProvider extends GenericAuth implements GenericProvider, GenericRecommendation, GenericSearch {
  private auth!: AuthFlow
  private _config!: ReturnType<SpotifyProvider['getConfig']>

  public get key() {
    return 'spotify'
  }

  private api = axios.create({
    adapter: cache.adapter,
    baseURL: BASE_URL,
    paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'comma' })
  })

  private getConfig(oauthChannel: string, id: string, secret: string) {
    return {
      openIdConnectUrl: 'https://accounts.spotify.com/authorize',
      clientId: id,
      clientSecret: secret,
      redirectUri: 'https://moosync.app/spotify',
      scope: 'playlist-read-private user-top-read user-library-read',
      keytarService: 'MoosyncSpotifyRefreshToken',
      oAuthChannel: oauthChannel
    }
  }

  public async updateConfig() {
    const conf = (await window.PreferenceUtils.loadSelective('spotify')) as { client_id: string; client_secret: string }

    if (conf) {
      const channel = await window.WindowUtils.registerOAuthCallback('spotifyoauthcallback')
      this._config = this.getConfig(channel, conf.client_id, conf.client_secret)

      const serviceConfig = new AuthorizationServiceConfiguration({
        authorization_endpoint: this._config.openIdConnectUrl,
        token_endpoint: 'https://accounts.spotify.com/api/token',
        revocation_endpoint: this._config.openIdConnectUrl
      })

      this.auth = new AuthFlow(this._config, serviceConfig)
    }

    return !!(conf && conf.client_id && conf.client_secret)
  }

  public get loggedIn() {
    if (this.auth) {
      vxm.providers.loggedInSpotify = this.auth.loggedIn()
      return this.auth.loggedIn()
    }
    return false
  }

  public async login() {
    if (!this.auth.loggedIn()) {
      if (this.auth.config) {
        const validRefreshToken = await this.auth.hasValidRefreshToken()
        if (validRefreshToken) {
          await this.auth.performWithFreshTokens()
          return true
        }

        const url = await this.auth.makeAuthorizationRequest()
        bus.$emit(EventBus.SHOW_OAUTH_MODAL, {
          providerName: 'Spotify',
          url,
          providerColor: '#1ED760',
          oauthPath: 'spotifyoauthcallback'
        } as LoginModalOptions)
        window.WindowUtils.openExternal(url)

        await once(this.auth.authStateEmitter, AuthStateEmitter.ON_TOKEN_RESPONSE)

        bus.$emit(EventBus.HIDE_OAUTH_MODAL)

        return true
      }
      return false
    }
    return true
  }

  public async signOut() {
    this.auth?.signOut()
  }

  private async populateRequest<K extends ApiResources>(
    resource: K,
    search: SpotifyResponses.SearchObject<K>,
    invalidateCache = false
  ): Promise<SpotifyResponses.ResponseType<K>> {
    const accessToken = await this.auth?.performWithFreshTokens()

    let url: string = resource

    if (resource === ApiResources.PLAYLIST_ITEMS || resource === ApiResources.PLAYLIST) {
      url = resource.replace('{playlist_id}', (search as SpotifyResponses.PlaylistItemsRequest).params.playlist_id)
    }

    if (resource === ApiResources.SONG_DETAILS) {
      url = resource.replace('{song_id}', (search as SpotifyResponses.TrackItemRequest).params.song_id)
    }

    if (resource === ApiResources.TOP) {
      url = resource.replace('{type}', (search as SpotifyResponses.TopRequest).params.type)
      search.params = undefined
    }

    if (resource === ApiResources.ARTIST_TOP || resource === ApiResources.ARTIST_ALBUMS) {
      url = resource.replace('{artist_id}', (search as SpotifyResponses.ArtistsTopTracks).params.id)
    }

    if (resource === ApiResources.ALBUM_SONGS) {
      url = resource.replace('{album_id}', (search as SpotifyResponses.AlbumTracksRequest).params.id)
    }

    const resp = await this.api(url, {
      params: search.params,
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      clearCacheEntry: invalidateCache
    })

    return resp.data
  }

  public async getUserDetails(): Promise<string | undefined> {
    const validRefreshToken = await this.auth?.hasValidRefreshToken()
    if (this.auth?.loggedIn() || validRefreshToken) {
      const resp = await this.populateRequest(ApiResources.USER_DETAILS, {
        params: undefined
      })

      return resp.display_name
    }
  }

  private parsePlaylists(items: SpotifyResponses.UserPlaylists.Item[]) {
    const parsed: ExtendedPlaylist[] = []
    for (const i of items) {
      parsed.push({
        playlist_id: `spotify-playlist:${i.id}`,
        playlist_name: i.name,
        playlist_coverPath: i.images[0] ? i.images[0].url : '',
        playlist_song_count: i.tracks.total,
        isRemote: true
      })
    }
    return parsed
  }

  public async getUserPlaylists(invalidateCache = false): Promise<ExtendedPlaylist[]> {
    const limit = 20
    let offset = 0
    let hasNext = true

    const validRefreshToken = await this.auth?.hasValidRefreshToken()
    const playlists: ExtendedPlaylist[] = []

    if (this.auth?.loggedIn() || validRefreshToken) {
      playlists.push({
        playlist_id: 'spotify-playlist:saved-tracks',
        playlist_name: 'Liked Songs',
        playlist_coverPath: 'https://t.scdn.co/images/3099b3803ad9496896c43f22fe9be8c4.png',
        isRemote: true
      })
      while (hasNext) {
        const resp = await this.populateRequest(
          ApiResources.PLAYLISTS,
          {
            params: { limit, offset }
          },
          invalidateCache
        )

        if (resp.next) {
          hasNext = true
          offset += limit
        } else {
          hasNext = false
        }

        playlists.push(...this.parsePlaylists(resp.items))
      }
    }
    return playlists
  }

  public async spotifyToYoutube(item: Song) {
    if (vxm.providers.loggedInYoutube) {
      const res = await vxm.providers.youtubeProvider.searchSongs(
        `${item.artists?.map((val) => val.artist_name ?? '').join(', ') ?? ''} ${item.title}`
      )
      console.debug('Found', res[0]?.title, '-', res[0]?.url, 'for spotify song', item.artists, item.title)
      if (res.length > 0) return res[0]
    }

    const ytItem = await window.SearchUtils.searchYT(
      item.title,
      item.artists?.map((val) => val.artist_name ?? ''),
      false,
      false,
      true
    )
    console.debug('Found', ytItem[0]?.title, '-', ytItem[0]?.url, 'for spotify song', item.artists, item.title)
    if (ytItem.length > 0) return ytItem[0]
  }

  private parseSong(track: SpotifyResponses.PlaylistItems.Track): Song {
    return {
      _id: `spotify:${track.id}`,
      title: track.name,
      album: {
        album_name: track.album.name,
        album_coverPath_high: track.album.images[0] ? track.album.images[0].url : ''
      },
      url: track.id,
      song_coverPath_high: track.album.images[0] ? track.album.images[0].url : '',
      artists: track.artists.map((artist) => ({ artist_name: artist.name, artist_id: `spotify-author:${artist.id}` })),
      duration: track.duration_ms / 1000,
      date_added: Date.now(),
      type: 'SPOTIFY'
    }
  }

  private async parsePlaylistItems(items: SpotifyResponses.PlaylistItems.Item[]) {
    const parsed: Song[] = []
    for (const i of items) {
      if (!i.is_local && parsed.findIndex((val) => val._id === i.track.id) === -1) parsed.push(this.parseSong(i.track))
    }
    return parsed
  }

  public matchPlaylist(str: string) {
    return !!str.match(/^(https:\/\/open.spotify.com\/playlist\/|spotify:playlist:)([a-zA-Z0-9]+)(.*)$/)
  }

  private getIDFromURL(url: string) {
    try {
      const split = new URL(url).pathname.split('/')
      return split[split.length - 1]
    } catch (_) {
      return url
    }
  }

  public async *getPlaylistContent(str: string, invalidateCache = false): AsyncGenerator<Song[]> {
    const id: string | undefined = this.getIDFromURL(str)

    if (id) {
      const validRefreshToken = await this.auth?.hasValidRefreshToken()
      if (this.auth?.loggedIn() || validRefreshToken) {
        let nextOffset = 0
        let isNext = false
        const limit = id === 'saved-tracks' ? 50 : 100
        const parsed: Song[] = []
        do {
          let resp: SpotifyResponses.PlaylistItems.PlaylistItems

          if (id === 'saved-tracks') {
            resp = await this.populateRequest(
              ApiResources.LIKED_SONGS,
              {
                params: {
                  limit,
                  offset: nextOffset
                }
              },
              invalidateCache
            )
          } else {
            resp = await this.populateRequest(
              ApiResources.PLAYLIST_ITEMS,
              {
                params: {
                  playlist_id: id,
                  limit,
                  offset: nextOffset
                }
              },
              invalidateCache
            )
          }
          const items = await this.parsePlaylistItems(resp.items)
          parsed.push(...items)
          isNext = !!resp.next
          if (resp.next) {
            nextOffset += limit
          }
          yield items
        } while (isNext)
      }
    }
    return
  }

  public async getPlaybackUrlAndDuration(song: Song) {
    const ytItem = await this.spotifyToYoutube(song)
    if (ytItem) {
      return { url: ytItem.url, duration: ytItem.duration ?? 0 }
    }
  }

  public async getPlaylistDetails(str: string, invalidateCache = false) {
    const id = this.getIDFromURL(str)

    if (id) {
      const validRefreshToken = await this.auth?.hasValidRefreshToken()
      if (this.auth?.loggedIn() || validRefreshToken) {
        const resp = await this.populateRequest(
          ApiResources.PLAYLIST,
          {
            params: {
              playlist_id: id
            }
          },
          invalidateCache
        )

        return this.parsePlaylists([resp])[0]
      }
    }
  }

  public async getSongDetails(url: string): Promise<Song | undefined> {
    if (url.match(/^(https:\/\/open.spotify.com\/track\/|spotify:track:)([a-zA-Z0-9]+)(.*)$/)) {
      const parsedURL = new URL(url)
      const split = parsedURL.pathname.split('/')
      const songID = split[split.length - 1]

      const validRefreshToken = await this.auth?.hasValidRefreshToken()

      if (this.auth?.loggedIn() || validRefreshToken) {
        const resp = await this.populateRequest(ApiResources.SONG_DETAILS, {
          params: {
            song_id: songID
          }
        })
        if (resp) {
          const song = this.parseSong(resp)
          const yt = await this.spotifyToYoutube(song)
          if (yt) {
            song.playbackUrl = yt.url
            return song
          } else {
            console.error("Couldn't find song on youtube")
          }
        }
        return
      }
    }
  }

  private parseRecommendations(recommendations: SpotifyResponses.RecommendationDetails.Recommendations) {
    const songList: Song[] = []
    for (const track of recommendations.tracks) {
      const song: Song = {
        _id: `spotify:${track.id}`,
        title: track.name,
        artists: track.artists.map((val) => ({
          artist_id: `spotify-author:${val.id}`,
          artist_name: val.name
        })),
        album: {
          album_name: track.album.name,
          album_artist: track.album.artists && track.album.artists.length > 0 ? track.album.artists[0].name : undefined
        },
        duration: track.duration_ms / 1000,
        date_added: Date.now(),
        type: 'SPOTIFY'
      }

      if (track.artists?.length > 0) {
        song.artists = []
        for (const artist of track.artists) {
          song.artists.push({
            artist_id: `spotify-author:${artist.id}`,
            artist_name: artist.name,
            artist_coverPath: artist.images?.at(0)?.url
          })
        }
      }

      if (track.album.images?.length > 0) {
        const high = track.album.images[0].url
        let low = high
        if (track.album.images[1]) low = track.album.images[1].url

        song.album = {
          ...song.album,
          album_coverPath_high: high,
          album_coverPath_low: low
        }

        song.song_coverPath_high = high
        song.song_coverPath_low = low
      }

      songList.push(song)
    }
    return songList
  }

  public async *getRecommendations(): AsyncGenerator<Song[]> {
    if (this.loggedIn) {
      const seedTracks: string[] = []
      const seedArtists: string[] = []

      const userArtists = await this.populateRequest(ApiResources.TOP, {
        params: {
          type: 'artists',
          time_range: 'long_term'
        }
      })

      let libraryTracks = await window.SearchUtils.searchSongsByOptions({
        song: {
          type: 'SPOTIFY'
        }
      })

      if (libraryTracks.length > 5) {
        libraryTracks = libraryTracks.sort(() => 0.5 - Math.random()).slice(0, 5)
      }

      seedTracks.push(...libraryTracks.map((val) => val._id.replace('spotify:', '')))

      if (seedTracks.length < 5) {
        const userTracks = await this.populateRequest(ApiResources.TOP, {
          params: {
            type: 'tracks',
            time_range: 'long_term'
          }
        })

        for (let i = 0; i < 5 - seedTracks.length; i++) {
          if (userTracks.items.length > i) {
            seedTracks.push(userTracks.items[i].id)
          }
        }
      }

      for (const item of userArtists.items) {
        seedArtists.push(item.id)
      }

      const recommendationsResp = await this.populateRequest(ApiResources.RECOMMENDATIONS, {
        params: {
          seed_artists: seedArtists,
          seed_tracks: seedTracks
        }
      })
      yield this.parseRecommendations(recommendationsResp)
    }
  }

  public async searchSongs(term: string): Promise<Song[]> {
    const songList: Song[] = []
    const resp = await this.populateRequest(ApiResources.SEARCH, {
      params: {
        query: term,
        type: 'track',
        limit: 20
      }
    })

    if (resp.tracks) {
      for (const s of resp.tracks.items) {
        songList.push(this.parseSong(s))
      }
    }
    return songList
  }

  private parseArtist(artist: SpotifyResponses.RecommendationDetails.SpotifyArtist): Artists {
    return {
      artist_id: `spotify-author:${artist.id}`,
      artist_name: artist.name,
      artist_coverPath: artist.images?.at(0)?.url
    }
  }

  public async searchArtists(term: string): Promise<Artists[]> {
    const artists: Artists[] = []
    const resp = await this.populateRequest(ApiResources.SEARCH, {
      params: {
        query: term,
        type: 'artist',
        limit: 20
      }
    })

    if (resp.artists) {
      for (const a of resp.artists.items) {
        artists.push(this.parseArtist(a))
      }
    }

    return artists
  }

  private async getArtistAlbums(artist_id: string) {
    const resp = await this.populateRequest(ApiResources.ARTIST_ALBUMS, {
      params: {
        id: artist_id,
        market: 'ES',
        limit: 20,
        offset: 0
      }
    })

    return resp.items
  }

  private async *getAlbumSongs(album: SpotifyResponses.RecommendationDetails.Album) {
    let nextOffset = 0
    let isNext = false
    const limit = 50

    do {
      const resp = await this.populateRequest(ApiResources.ALBUM_SONGS, {
        params: {
          id: album.id,
          market: 'ES',
          limit: limit,
          offset: nextOffset
        }
      })

      isNext = !!resp.next
      if (isNext) {
        nextOffset += limit
      }

      for (const s of resp.items) {
        yield this.parseSong({
          ...s,
          album
        })
      }
    } while (isNext)
  }

  public async *getArtistSongs(artist: Artists): AsyncGenerator<Song[]> {
    const artist_id = artist.artist_extra_info?.spotify?.artist_id
    if (artist_id) {
      const resp = await this.populateRequest(ApiResources.ARTIST_TOP, {
        params: {
          id: artist_id,
          market: 'ES'
        }
      })

      for (const s of resp.tracks) {
        yield [this.parseSong(s)]
      }

      const albums = await this.getArtistAlbums(artist_id)
      for (const a of albums) {
        for await (const s of this.getAlbumSongs(a)) yield [s]
      }
    }
  }
}
