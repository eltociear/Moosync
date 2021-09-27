/* 
 *  youtube.ts is a part of Moosync.
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
import moment from 'moment';
import { once } from 'events';
import qs from 'qs';

const BASE_URL = 'https://youtube.googleapis.com/youtube/v3/'

enum ApiResources {
  CHANNELS = 'channels',
  PLAYLISTS = 'playlists',
  PLAYLIST_ITEMS = 'playlistItems',
  VIDEO_DETAILS = 'videos',
  SEARCH = 'search'
}

export class YoutubeProvider implements GenericProvider, GenericRecommendation {
  private auth = new AuthFlow('youtube')

  private api = axios.create({
    adapter: cache.adapter,
    baseURL: BASE_URL,
    paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' })
  })

  public get loggedIn() {
    return this.auth.loggedIn()
  }

  public async login() {
    if (!this.loggedIn && this.auth.config) {
      const validRefreshToken = await this.auth.hasValidRefreshToken()
      if (validRefreshToken) {
        await this.auth.performWithFreshTokens()
        return
      }
      await this.auth.makeAuthorizationRequest()
      return once(this.auth.authStateEmitter!, AuthStateEmitter.ON_TOKEN_RESPONSE)
    }
  }

  public async signOut() {
    this.auth.signOut()
  }

  private async populateRequest<K extends ApiResources>(resource: K, search: YoutubeResponses.SearchObject<K>): Promise<YoutubeResponses.ResponseType<K>> {
    const accessToken = await this.auth.performWithFreshTokens()
    const resp = await this.api(resource, {
      params: search.params,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })

    return resp.data
  }

  public async getUserDetails(): Promise<string | undefined> {
    const validRefreshToken = await this.auth.hasValidRefreshToken()
    if (this.auth.loggedIn() || validRefreshToken) {
      const resp = await this.populateRequest(ApiResources.CHANNELS, {
        params: {
          part: ['id', 'snippet'],
          mine: true,
        }
      })
      return resp.items[0].snippet!.title
    }
  }

  private async parsePlaylists(items: YoutubeResponses.UserPlaylists.Item[]): Promise<Playlist[]> {
    const playlists: Playlist[] = []
    if (items.length > 0) {
      for (const p of items) {
        if (p.snippet)
          playlists.push({
            playlist_id: `youtube-${p.id}`,
            playlist_name: p.snippet.title,
            playlist_coverPath: (p.snippet.thumbnails.maxres ?? p.snippet.thumbnails.high ?? p.snippet.thumbnails.default).url,
            playlist_song_count: p.contentDetails.itemCount,
            isRemote: true
          })
      }
    }
    return playlists
  }

  public async getUserPlaylists() {
    const validRefreshToken = await this.auth.hasValidRefreshToken()
    if (this.auth.loggedIn() || validRefreshToken) {
      let nextPageToken: string | undefined
      const parsed: YoutubeResponses.UserPlaylists.Item[] = []
      do {

        const resp = await this.populateRequest(ApiResources.PLAYLISTS, {
          params: {
            part: ['id', 'contentDetails', 'snippet'],
            mine: true,
            maxResults: 50,
            pageToken: nextPageToken
          }
        })
        parsed.push(...resp.items)
      } while (nextPageToken)
      return this.parsePlaylists(parsed)
    }
    return []
  }

  private async parsePlaylistItems(items: YoutubeResponses.PlaylistItems.Items[]): Promise<Song[]> {
    const songs: Song[] = []
    if (items.length > 0) {
      const ids = items.map(s => s.snippet!.resourceId.videoId)
      const details = await this.getSongDetailsFromID(...ids)
      songs.push(...details)
    }
    return songs
  }

  public matchPlaylist(str: string) {
    return !!str.match(/^((?:https?:)?\/\/)?((?:www|m|music)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/)
  }

  private getIDFromURL(url: string) {
    return new URL(url)?.searchParams?.get('list') ?? undefined
  }

  public async * getPlaylistContent(str: string, isUrl = false): AsyncGenerator<Song[]> {
    let id: string | undefined = str

    if (isUrl) {
      id = this.getIDFromURL(str)
    }

    if (id) {
      const validRefreshToken = await this.auth.hasValidRefreshToken()
      if (this.auth.loggedIn() || validRefreshToken) {
        let nextPageToken: string | undefined
        do {
          const resp = await this.populateRequest(ApiResources.PLAYLIST_ITEMS, {
            params: {
              part: ['id', 'snippet'],
              playlistId: id,
              maxResults: 50,
              pageToken: nextPageToken
            }
          })
          nextPageToken = resp.nextPageToken
          const parsed = await this.parsePlaylistItems(resp.items)
          yield parsed
        } while (nextPageToken)
      }
      yield []
    }
    return
  }

  private async parseVideo(items: YoutubeResponses.VideoDetails.Item[]) {
    const songs: Song[] = []
    for (const v of items) {
      if (songs.findIndex((value) => value._id === v.id) === -1)
        songs.push({
          _id: v.id,
          title: v.snippet.title,
          artists: [v.snippet.channelTitle.replace('-', '').replace('Topic', '').trim()],
          song_coverPath_high: (v.snippet.thumbnails.maxres ?? v.snippet.thumbnails.high ?? v.snippet.thumbnails.default).url,
          song_coverPath_low: (v.snippet.thumbnails.standard ?? v.snippet.thumbnails.standard ?? v.snippet.thumbnails.default).url,
          album: {
            album_name: 'Misc',
          },
          date: new Date(v.snippet.publishedAt).toISOString().slice(0, 10),
          date_added: Date.now().toString(),
          duration: moment.duration(v.contentDetails.duration).asSeconds(),
          url: v.id,
          type: 'YOUTUBE'
        })
    }
    return songs
  }

  private async getSongDetailsFromID(...id: string[]) {
    const validRefreshToken = await this.auth.hasValidRefreshToken()
    if (this.auth.loggedIn() || validRefreshToken) {
      const resp = await this.populateRequest(ApiResources.VIDEO_DETAILS, {
        params: {
          part: ['contentDetails', 'snippet'],
          id: id,
          maxResults: 50,
        }
      })
      return this.parseVideo(resp.items)
    }
    return []
  }

  public async getPlaybackUrlAndDuration(song: Song) {
    if (song.url)
      return { url: song.url!, duration: song.duration }
  }

  public async getPlaylistDetails(str: string, isUrl = false) {
    let id: string | undefined = str
    if (isUrl) {
      id = this.getIDFromURL(str)
    }

    if (id) {
      const resp = await this.populateRequest(ApiResources.PLAYLISTS, {
        params: {
          id,
          part: ['id', 'contentDetails', 'snippet'],
          maxResults: 1,
        }
      })
      return (await this.parsePlaylists(resp.items))[0]
    }
  }

  public async getSongDetails(url: string): Promise<Song | undefined> {
    if (url.match(/^((?:https?:)?\/\/)?((?:www|m|music)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/)) {
      const parsedUrl = new URL(url)
      const videoID = parsedUrl.searchParams.get('v')

      if (videoID) {
        const details = await this.getSongDetailsFromID(videoID)
        if (details && details.length > 0) {
          return details[0]
        }
      }
      return
    }
  }

  public async * getRecommendations(): AsyncGenerator<Song[]> {
    if (this.loggedIn) {
      const youtubeSongs = await window.SearchUtils.searchSongsByOptions({
        song: {
          type: 'YOUTUBE'
        }
      })

      const resp: string[] = [];

      const maxResults: number = Math.max(10 / youtubeSongs.length, 1)

      const baseParams: YoutubeResponses.SearchRequest = {
        params: {
          type: 'video',
          videoCategoryId: 10,
          videoDuration: 'short',
          videoEmbeddable: true,
          order: 'date'
        }
      }

      for (const song of youtubeSongs) {
        (await this.populateRequest(ApiResources.SEARCH, {
          params: {
            ...baseParams.params,
            maxResults,
            relatedToVideoId: song.url
          }
        })).items.forEach((val) => resp.push(val.id.videoId))
      }

      if (resp.length < 10) {
        (await this.populateRequest(ApiResources.SEARCH, {
          params: {
            ...baseParams.params,
            maxResults: 10 - resp.length
          }
        })).items.forEach((val) => resp.push(val.id.videoId))
      }

      yield await this.getSongDetailsFromID(...resp)
    }
  }
}