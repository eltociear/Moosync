/* 
 *  spotify.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { AuthFlow, AuthStateEmitter } from '@/utils/ui/oauth/flow';
import { GenericProvider, cache } from '@/utils/ui/providers/genericProvider';

import { GenericRecommendation } from './recommendations/genericRecommendations';
import axios from 'axios';
import { forageStore } from './genericProvider';
import { once } from 'events';
import qs from 'qs';
import { vxm } from '@/mainWindow/store';

/**
 * Spotify API base URL
 */
const BASE_URL = 'https://api.spotify.com/v1/'

enum ApiResources {
  USER_DETAILS = 'me',
  PLAYLISTS = 'me/playlists',
  PLAYLIST = 'playlists/{playlist_id}',
  PLAYLIST_ITEMS = 'playlists/{playlist_id}/tracks',
  SONG_DETAILS = 'tracks/{song_id}',
  TOP = 'me/top/{type}',
  RECOMMENDATIONS = 'recommendations'
}

/**
 * API Handler for Spotify.
 */
export class SpotifyProvider implements GenericProvider, GenericRecommendation {
  private auth = new AuthFlow('spotify')

  private api = axios.create({
    adapter: cache.adapter,
    baseURL: BASE_URL,
    paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'comma' })
  })

  public get loggedIn() {
    vxm.providers.loggedInSpotify = this.auth.loggedIn()
    return this.auth.loggedIn()
  }

  public async login() {
    if (!this.auth.loggedIn() && this.auth.config) {
      const validRefreshToken = await this.auth.hasValidRefreshToken()
      if (validRefreshToken) {
        await this.auth.performWithFreshTokens()
        return
      }
      this.auth.makeAuthorizationRequest()
      return once(this.auth.authStateEmitter!, AuthStateEmitter.ON_TOKEN_RESPONSE)
    }
  }

  public async signOut() {
    this.auth.signOut()
  }

  private async populateRequest<K extends ApiResources>(resource: K, search: SpotifyResponses.SearchObject<K>): Promise<SpotifyResponses.ResponseType<K>> {
    const accessToken = await this.auth.performWithFreshTokens()

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

    const resp = await this.api(url, {
      params: search.params,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })

    return resp.data
  }

  public async getUserDetails(): Promise<string | undefined> {
    const validRefreshToken = await this.auth.hasValidRefreshToken()
    if (this.auth.loggedIn() || validRefreshToken) {
      const resp = await this.populateRequest(ApiResources.USER_DETAILS, {
        params: undefined
      })

      return resp.display_name
    }
  }

  private parsePlaylists(items: SpotifyResponses.UserPlaylists.Item[]) {
    const parsed: Playlist[] = []
    for (const i of items) {
      parsed.push({
        playlist_id: `spotify-${i.id}`,
        playlist_name: i.name,
        playlist_coverPath: (i.images[0]) ? i.images[0].url : '',
        playlist_song_count: i.tracks.total,
        isRemote: true
      })
    }
    return parsed
  }

  public async getUserPlaylists(): Promise<Playlist[]> {
    const validRefreshToken = await this.auth.hasValidRefreshToken()
    if (this.auth.loggedIn() || validRefreshToken) {
      const resp = await this.populateRequest(ApiResources.PLAYLISTS, {
        params: {}
      })
      return this.parsePlaylists(resp.items)
    }
    return []
  }

  public async spotifyToYoutube(item: Song) {
    const term = `${(item.artists) ? item.artists.join(' ') : ''} ${item.title}`
    const ytItem = await window.SearchUtils.searchYT(term)
    if (ytItem.length > 0)
      return ytItem[0]
  }

  private parseSong(track: SpotifyResponses.PlaylistItems.Track): Song {
    return {
      _id: track.id,
      title: track.name,
      album: {
        album_name: track.album.name,
        album_coverPath_high: (track.album.images[0]) ? track.album.images[0].url : ''
      },
      url: track.id,
      song_coverPath_high: (track.album.images[0]) ? track.album.images[0].url : '',
      artists: track.artists.map(artist => artist.name),
      duration: track.duration_ms / 1000,
      date_added: Date.now().toString(),
      type: 'SPOTIFY'
    }
  }

  private async parsePlaylistItems(items: SpotifyResponses.PlaylistItems.Item[]) {
    const parsed: Song[] = []
    for (const i of items) {
      if (!i.is_local && parsed.findIndex((val) => val._id === i.track.id) === -1)
        parsed.push(this.parseSong(i.track))
    }
    return parsed
  }

  public matchPlaylist(str: string) {
    return !!str.match(/^(https:\/\/open.spotify.com\/playlist\/|spotify:playlist:)([a-zA-Z0-9]+)(.*)$/)
  }

  private getIDFromURL(url: string) {
    const split = new URL(url).pathname.split('/')
    return split[split.length - 1]
  }

  public async * getPlaylistContent(str: string, isUrl = false): AsyncGenerator<Song[]> {
    let id: string | undefined = str

    if (isUrl) {
      id = this.getIDFromURL(str)
    }

    if (id) {
      const validRefreshToken = await this.auth.hasValidRefreshToken()
      if (this.auth.loggedIn() || validRefreshToken) {

        // Return directly from cache
        const content = await this.getCachePlaylistContent(id)
        if (content) {
          yield content
          return
        }

        let nextOffset: number = 0
        let isNext = false
        const limit = 100
        const parsed: Song[] = []
        do {
          const resp = await this.populateRequest(ApiResources.PLAYLIST_ITEMS, {
            params: {
              playlist_id: id,
              limit: limit,
              offset: nextOffset
            }
          })
          const items = await this.parsePlaylistItems(resp.items)
          parsed.push(...items)
          isNext = !!resp.next
          if (resp.next) {
            nextOffset += limit
          }
          yield items;
        } while (isNext)
        this.setCachePlaylistContent(id, parsed)
      }
    }
    return
  }

  private async getCachePlaylistContent(playlist_id: string) {
    const content = await forageStore.getItem<{ expires: number, data: Song[] }>(`spotify-playlist-${playlist_id}`)
    if (content && content.expires > Date.now())
      return content.data;
    return null
  }

  private async setCachePlaylistContent(playlist_id: string, items: Song[]) {
    // Cache for 1hr
    await forageStore.setItem(`spotify-playlist-${playlist_id}`, { expires: Date.now() + 1 * 60 * 60 * 5 * 1000, data: items })
  }

  public async getPlaybackUrlAndDuration(song: Song) {
    const ytItem = await this.spotifyToYoutube(song)
    if (ytItem) {
      return { url: ytItem.youtubeId, duration: ytItem.duration!.totalSeconds }
    }
  }

  public async getPlaylistDetails(str: string, isUrl = false) {
    let id: string | undefined = str
    if (isUrl) {
      id = this.getIDFromURL(str)
    }

    if (id) {
      const validRefreshToken = await this.auth.hasValidRefreshToken()
      if (this.auth.loggedIn() || validRefreshToken) {
        const resp = await this.populateRequest(ApiResources.PLAYLIST, {
          params: {
            playlist_id: id,
          }
        })

        return this.parsePlaylists([resp])[0]
      }
    }
  }

  public async getSongDetails(url: string): Promise<Song | undefined> {
    if (url.match(/^(https:\/\/open.spotify.com\/track\/|spotify:track:)([a-zA-Z0-9]+)(.*)$/)) {
      const parsedURL = new URL(url)
      const split = parsedURL.pathname.split('/')
      const songID = split[split.length - 1]

      const validRefreshToken = await this.auth.hasValidRefreshToken()

      if (this.auth.loggedIn() || validRefreshToken) {
        const resp = await this.populateRequest(ApiResources.SONG_DETAILS, {
          params: {
            song_id: songID,
          }
        })
        if (resp) {
          const song = this.parseSong(resp)
          const yt = await this.spotifyToYoutube(song)
          if (yt) {
            song.playbackUrl = yt?.youtubeId
            return song
          } else {
            console.error('Couldn\'t find song on youtube')
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
        _id: track.id,
        title: track.name,
        album: {
          album_name: track.album.name,
          album_artist: (track.album.artists && track.album.artists.length > 0) ? track.album.artists[0].name : undefined,
        },
        duration: track.duration_ms / 1000,
        date_added: Date.now().toString(),
        type: 'SPOTIFY'
      }

      if (track.artists?.length > 0) {
        song.artists = []
        for (const artist of track.artists) {
          song.artists.push(artist.name)
        }
      }

      if (track.album.images?.length > 0) {
        const high = track.album.images[0].url
        let low = high
        if (track.album.images[1])
          low = track.album.images[1].url

        song.song_coverPath_high = high
        song.album!.album_coverPath_high = high
        song.song_coverPath_low = low
        song.album!.album_coverPath_low = low
      }

      songList.push(song)
    }
    return songList
  }

  public async * getRecommendations(): AsyncGenerator<Song[]> {
    if (this.loggedIn) {
      const userTracks: any = await this.populateRequest(ApiResources.TOP, {
        params: {
          type: 'tracks',
          time_range: 'long_term'
        }
      })

      const userArtists: any = await this.populateRequest(ApiResources.TOP, {
        params: {
          type: 'artists',
          time_range: 'long_term'
        }
      })

      const seedTracks = []
      const seedArtists = []

      for (const item of userTracks.items) {
        seedTracks.push(item.id)
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
}