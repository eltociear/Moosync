/*
 *  youtube.ts is a part of Moosync.
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
import { vxm } from '../../../mainWindow/store/index'
import { parseISO8601Duration } from '@/utils/common'
import { bus } from '@/mainWindow/main'
import { EventBus } from '@/utils/main/ipc/constants'

const BASE_URL = 'https://youtube.googleapis.com/youtube/v3/'

enum ApiResources {
  CHANNELS = 'channels',
  PLAYLISTS = 'playlists',
  PLAYLIST_ITEMS = 'playlistItems',
  VIDEO_DETAILS = 'videos',
  SEARCH = 'search'
}

export class YoutubeProvider extends GenericAuth implements GenericProvider, GenericRecommendation {
  private auth!: AuthFlow
  private _config!: ReturnType<YoutubeProvider['getConfig']>

  private getConfig(oauthChannel: string, id: string, secret: string) {
    return {
      openIdConnectUrl: 'https://accounts.google.com',
      clientId: id,
      clientSecret: secret,
      redirectUri: 'https://moosync.app/youtube',
      scope: 'https://www.googleapis.com/auth/youtube.readonly',
      keytarService: 'MoosyncYoutubeRefreshToken',
      oAuthChannel: oauthChannel
    }
  }

  private isEnvExists() {
    return !!(process.env.YoutubeClientID && process.env.YoutubeClientSecret)
  }

  public async updateConfig(): Promise<boolean> {
    const conf = (await window.PreferenceUtils.loadSelective('youtube')) as { client_id: string; client_secret: string }

    if (conf || this.isEnvExists()) {
      const channel = await window.WindowUtils.registerOAuthCallback('ytoauth2callback')

      const secret = process.env.YoutubeClientSecret ?? conf.client_secret
      const id = process.env.YoutubeClientID ?? conf.client_id
      this._config = this.getConfig(channel, id, secret)

      const serviceConfig = new AuthorizationServiceConfiguration({
        authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        revocation_endpoint: 'https://oauth2.googleapis.com/revoke',
        token_endpoint: 'https://oauth2.googleapis.com/token',
        userinfo_endpoint: 'https://openidconnect.googleapis.com/v1/userinfo'
      })

      this.auth = new AuthFlow(this._config, serviceConfig)
    }

    return !!(conf && conf.client_id && conf.client_secret) || this.isEnvExists()
  }

  private api = axios.create({
    adapter: cache.adapter,
    baseURL: BASE_URL,
    paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' })
  })

  public get loggedIn() {
    if (this.auth) {
      vxm.providers.loggedInYoutube = this.auth.loggedIn()
      return this.auth.loggedIn()
    }
    return false
  }

  public async login() {
    if (!this.loggedIn) {
      if (this.auth?.config) {
        const validRefreshToken = await this.auth.hasValidRefreshToken()
        if (validRefreshToken) {
          await this.auth.performWithFreshTokens()
          return true
        }

        const url = await this.auth.makeAuthorizationRequest()
        bus.$emit(EventBus.SHOW_OAUTH_MODAL, {
          providerName: 'Youtube',
          url,
          providerColor: '#E62017',
          oauthPath: 'ytoauth2callback'
        } as LoginModalData)
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
    search: YoutubeResponses.SearchObject<K>,
    invalidateCache = false
  ): Promise<YoutubeResponses.ResponseType<K>> {
    const accessToken = await this.auth?.performWithFreshTokens()
    const resp = await this.api(resource, {
      params: search.params,
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      clearCacheEntry: invalidateCache
    })

    return resp.data
  }

  public async getUserDetails(invalidateCache = false, retries = 0): Promise<string | undefined> {
    const validRefreshToken = await this.auth?.hasValidRefreshToken()
    if (this.auth?.loggedIn() || validRefreshToken) {
      const resp = await this.populateRequest(
        ApiResources.CHANNELS,
        {
          params: {
            part: ['id', 'snippet'],
            mine: true
          }
        },
        invalidateCache
      )

      const username = resp?.items?.at(0)?.snippet?.title
      if (username || retries > 0) {
        return username
      }

      return this.getUserDetails(true, retries + 1)
    }
  }

  private async parsePlaylists(items: YoutubeResponses.UserPlaylists.Item[]): Promise<ExtendedPlaylist[]> {
    const playlists: ExtendedPlaylist[] = []
    if (items.length > 0) {
      for (const p of items) {
        if (p.snippet)
          playlists.push({
            playlist_id: `youtube-playlist:${p.id}`,
            playlist_name: p.snippet.title,
            playlist_coverPath: (
              p.snippet.thumbnails.maxres ??
              p.snippet.thumbnails.high ??
              p.snippet.thumbnails.default
            ).url,
            playlist_song_count: p.contentDetails.itemCount,
            isRemote: true
          })
      }
    }
    return playlists
  }

  public async getUserPlaylists(invalidateCache = false) {
    const validRefreshToken = await this.auth?.hasValidRefreshToken()
    if (this.auth?.loggedIn() || validRefreshToken) {
      let nextPageToken: string | undefined
      const parsed: YoutubeResponses.UserPlaylists.Item[] = []
      do {
        const resp = await this.populateRequest(
          ApiResources.PLAYLISTS,
          {
            params: {
              part: ['id', 'contentDetails', 'snippet'],
              mine: true,
              maxResults: 50,
              pageToken: nextPageToken
            }
          },
          invalidateCache
        )
        parsed.push(...resp.items)
      } while (nextPageToken)
      return this.parsePlaylists(parsed)
    }
    return []
  }

  private async parsePlaylistItems(
    items: YoutubeResponses.PlaylistItems.Items[],
    invalidateCache = false
  ): Promise<Song[]> {
    const songs: Song[] = []
    if (items.length > 0) {
      const ids = items.map((s) => s.snippet?.resourceId.videoId) as string[]
      const details = await this.getSongDetailsFromID(invalidateCache, ...ids)
      songs.push(...details)
    }
    return songs
  }

  public matchPlaylist(str: string) {
    return !!str.match(
      /^((?:https?:)?\/\/)?((?:www|m|music)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/
    )
  }

  private getIDFromURL(url: string) {
    try {
      return new URL(url)?.searchParams?.get('list') ?? url
    } catch (_) {
      return url
    }
  }

  public async *getPlaylistContent(str: string, invalidateCache = false): AsyncGenerator<Song[]> {
    const id: string | undefined = this.getIDFromURL(str)

    if (id) {
      const validRefreshToken = await this.auth?.hasValidRefreshToken()
      if (this.auth?.loggedIn() || validRefreshToken) {
        let nextPageToken: string | undefined
        do {
          const resp = await this.populateRequest(
            ApiResources.PLAYLIST_ITEMS,
            {
              params: {
                part: ['id', 'snippet'],
                playlistId: id,
                maxResults: 50,
                pageToken: nextPageToken
              }
            },
            invalidateCache
          )
          nextPageToken = resp.nextPageToken
          const parsed = await this.parsePlaylistItems(resp.items, invalidateCache)
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
          _id: `youtube:${v.id}`,
          title: v.snippet.title,
          artists: [
            {
              artist_id: `youtube-author:${v.snippet.channelId}`,
              artist_name: v.snippet.channelTitle.replace('-', '').replace('Topic', '').trim()
            }
          ],
          song_coverPath_high: (
            v.snippet.thumbnails.maxres ??
            v.snippet.thumbnails.high ??
            v.snippet.thumbnails.default
          ).url,
          song_coverPath_low: (
            v.snippet.thumbnails.standard ??
            v.snippet.thumbnails.standard ??
            v.snippet.thumbnails.default
          ).url,
          album: {
            album_name: 'Misc'
          },
          date: new Date(v.snippet.publishedAt).toISOString().slice(0, 10),
          date_added: Date.now(),
          duration: parseISO8601Duration(v.contentDetails.duration),
          url: v.id,
          type: 'YOUTUBE'
        })
    }
    return songs
  }

  private async getSongDetailsFromID(invalidateCache: boolean, ...id: string[]) {
    const validRefreshToken = await this.auth?.hasValidRefreshToken()
    if (this.auth?.loggedIn() || validRefreshToken) {
      const resp = await this.populateRequest(
        ApiResources.VIDEO_DETAILS,
        {
          params: {
            part: ['contentDetails', 'snippet'],
            id: id,
            maxResults: 50
          }
        },
        invalidateCache
      )
      return this.parseVideo(resp.items)
    }
    return []
  }

  public async getPlaybackUrlAndDuration(song: Song) {
    if (song.url) return { url: song.url, duration: song.duration }
  }

  public async getPlaylistDetails(str: string, invalidateCache = false) {
    const id = this.getIDFromURL(str)

    if (id) {
      const resp = await this.populateRequest(
        ApiResources.PLAYLISTS,
        {
          params: {
            id,
            part: ['id', 'contentDetails', 'snippet'],
            maxResults: 1
          }
        },
        invalidateCache
      )
      return (await this.parsePlaylists(resp.items))[0]
    }
  }

  public async searchSongs(term: string): Promise<Song[]> {
    const songList: Song[] = []
    const resp = await this.populateRequest(ApiResources.SEARCH, {
      params: {
        part: ['id', 'snippet'],
        q: term,
        type: 'video',
        maxResults: 30,
        order: 'relevance',
        videoEmbeddable: true
      }
    })

    const finalIDs: string[] = []
    if (resp.items) {
      resp.items.forEach((val) => finalIDs.push(val.id.videoId))
      songList.push(...(await this.getSongDetailsFromID(false, ...finalIDs)))
    }

    return songList
  }

  public async getSongDetails(url: string, invalidateCache = false): Promise<Song | undefined> {
    if (
      url.match(
        /^((?:https?:)?\/\/)?((?:www|m|music)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/
      )
    ) {
      const parsedUrl = new URL(url)
      const videoID = parsedUrl.searchParams.get('v')

      if (videoID) {
        const details = await this.getSongDetailsFromID(invalidateCache, videoID)
        if (details && details.length > 0) {
          return details[0]
        }

        // Apparently searching Video ID in youtube returns the proper video as first result
        const scraped = await window.SearchUtils.searchYT(videoID, undefined, false, false)
        if (scraped && scraped.length > 0) {
          return scraped[0]
        }
      }
      return
    }
  }

  public async *getRecommendations(): AsyncGenerator<Song[]> {
    const youtubeSongs = await window.SearchUtils.searchSongsByOptions({
      song: {
        type: 'YOUTUBE'
      }
    })

    const resp: string[] = []

    let count = 0
    for (const song of youtubeSongs.slice(0, 10)) {
      if (song.url) {
        const songs = await window.SearchUtils.getYTSuggestions(song.url)
        count += songs.length
        yield songs
      }
    }

    if (this.loggedIn) {
      if (count < 10) {
        ;(
          await this.populateRequest(ApiResources.SEARCH, {
            params: {
              part: ['id', 'snippet'],
              type: 'video',
              videoCategoryId: 10,
              videoDuration: 'short',
              videoEmbeddable: true,
              order: 'date',
              maxResults: 10 - resp.length
            }
          })
        ).items.forEach((val) => resp.push(val.id.videoId))
      }

      yield await this.getSongDetailsFromID(false, ...resp)
    }
  }

  public async *getArtistSongs(): AsyncGenerator<Song[]> {
    yield []
  }
}
