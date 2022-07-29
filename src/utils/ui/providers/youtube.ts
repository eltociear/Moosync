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

  public get key() {
    return 'youtube'
  }

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

  public async getLoggedIn() {
    if (this.auth) {
      const tmp = await this.auth.loggedIn()
      vxm.providers.loggedInYoutube = tmp
      return tmp
    }
    return false
  }

  public async login() {
    if (!(await this.getLoggedIn())) {
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
    if ((await this.auth?.loggedIn()) || validRefreshToken) {
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
    if ((await this.getLoggedIn()) || validRefreshToken) {
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
      const ids = items.map((s) => ({ id: s.snippet?.resourceId.videoId, date: s.snippet?.publishedAt }))
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
      if ((await this.getLoggedIn()) || validRefreshToken) {
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

  private async parseVideo(items: { item: YoutubeResponses.VideoDetails.Item; date?: string }[]) {
    const songs: Song[] = []
    for (const v of items) {
      if (songs.findIndex((value) => value._id === v.item.id) === -1)
        songs.push({
          _id: `youtube:${v.item.id}`,
          title: v.item.snippet.title,
          artists: [
            {
              artist_id: `youtube-author:${v.item.snippet.channelId}`,
              artist_name: v.item.snippet.channelTitle.replace('-', '').replace('Topic', '').trim(),
              artist_extra_info: {
                youtube: {
                  channel_id: v.item.snippet.channelId
                }
              }
            }
          ],
          song_coverPath_high: (
            v.item.snippet.thumbnails.maxres ??
            v.item.snippet.thumbnails.high ??
            v.item.snippet.thumbnails.default
          ).url,
          song_coverPath_low: (
            v.item.snippet.thumbnails.standard ??
            v.item.snippet.thumbnails.standard ??
            v.item.snippet.thumbnails.default
          ).url,
          album: {
            album_name: 'Misc'
          },
          date: new Date(v.item.snippet.publishedAt).toISOString().slice(0, 10),
          date_added: Date.parse(v.date ?? ''),
          duration: parseISO8601Duration(v.item.contentDetails.duration),
          url: v.item.id,
          type: 'YOUTUBE'
        })
    }
    return songs
  }

  private async getSongDetailsFromID(invalidateCache: boolean, ...songs: { id?: string; date?: string }[]) {
    const validRefreshToken = await this.auth?.hasValidRefreshToken()
    if ((await this.getLoggedIn()) || validRefreshToken) {
      const filtered = songs.filter((val) => !!val)
      const resp = await this.populateRequest(
        ApiResources.VIDEO_DETAILS,
        {
          params: {
            part: ['contentDetails', 'snippet'],
            id: filtered.map((val) => val.id) as string[],
            maxResults: 50
          }
        },
        invalidateCache
      )

      if (filtered.length !== resp.items.length) {
        console.warn('Something went wrong while parsing song details. Length mismatch')
      }

      const items: Parameters<typeof this.parseVideo>[0] = []

      for (let i = 0; i < resp.items.length; i++) {
        items.push({ item: resp.items[i], date: filtered[i].date ?? resp.items[i].snippet.publishedAt })
      }
      return this.parseVideo(items)
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

    const finalIDs: Parameters<typeof this.getSongDetailsFromID>[1][] = []
    if (resp.items) {
      resp.items.forEach((val) => finalIDs.push({ id: val.id.videoId, date: val.snippet.publishedAt }))
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
        const details = await this.getSongDetailsFromID(invalidateCache, { id: videoID })
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

    const resp: Parameters<typeof this.getSongDetailsFromID>[1][] = []

    let count = 0
    for (const song of youtubeSongs.slice(0, 10)) {
      if (song.url) {
        const songs = await window.SearchUtils.getYTSuggestions(song.url)
        count += songs.length
        yield songs
      }
    }

    if (await this.getLoggedIn()) {
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
        ).items.forEach((val) => resp.push({ id: val.id.videoId, date: val.snippet.publishedAt }))
      }

      yield await this.getSongDetailsFromID(false, ...resp)
    }
  }

  public async *getArtistSongs(artist: Artists): AsyncGenerator<Song[]> {
    const channelId = artist.artist_extra_info?.youtube?.channel_id
    const finalIDs: Parameters<typeof this.getSongDetailsFromID>[1][] = []

    if (channelId) {
      let pageToken: string | undefined

      do {
        const resp = await this.populateRequest(ApiResources.SEARCH, {
          params: {
            part: ['id', 'snippet'],
            type: 'video',
            maxResults: 50,
            order: 'relevance',
            videoEmbeddable: true,
            pageToken,
            channelId
          }
        })

        if (resp.items) {
          resp.items.forEach((val) => finalIDs.push({ id: val.id.videoId, date: val.snippet?.publishedAt }))
        }

        pageToken = resp.nextPageToken
      } while (pageToken)

      while (finalIDs.length > 0) {
        yield this.getSongDetailsFromID(false, ...finalIDs.splice(0, 50))
      }
    } else {
      const resp = await this.populateRequest(ApiResources.SEARCH, {
        params: {
          part: ['id', 'snippet'],
          type: 'video',
          maxResults: 50,
          order: 'relevance',
          videoEmbeddable: true,
          q: `${artist.artist_name} music`
        }
      })

      if (resp.items) {
        resp.items.forEach((val) => finalIDs.push({ id: val.id.videoId, date: val.snippet?.publishedAt }))
        yield this.getSongDetailsFromID(false, ...finalIDs)
      }
    }
  }

  private parseArtist(artist: YoutubeResponses.ChannelInfo.ChannelInfo): Artists | undefined {
    if (artist.items.length > 0) {
      return {
        artist_id: `youtube-author:${artist.items[0].id}`,
        artist_coverPath:
          artist.items[0].snippet?.thumbnails?.maxres?.url ??
          artist.items[0].snippet?.thumbnails?.high?.url ??
          artist.items[0].snippet?.thumbnails?.default?.url,
        artist_extra_info: {
          youtube: {
            channel_id: artist.items[0].id
          }
        },
        artist_name: artist.items[0].snippet?.title
      }
    }
  }

  public async getArtistDetails(artist: Artists, forceFetch = false) {
    if (artist.artist_extra_info?.youtube?.channel_id) {
      const artistDetails = await this.populateRequest(ApiResources.CHANNELS, {
        params: {
          id: artist.artist_extra_info?.youtube?.channel_id,
          part: ['id', 'snippet']
        }
      })

      return this.parseArtist(artistDetails)
    }
  }

  private parseSearchArtist(...items: YoutubeResponses.SearchDetails.Item[]) {
    const artists: Artists[] = []

    for (const i of items) {
      artists.push({
        artist_id: `youtube-author:${i.snippet.channelId}`,
        artist_name: i.snippet.channelTitle,
        artist_coverPath: (i.snippet.thumbnails.maxres ?? i.snippet.thumbnails.high ?? i.snippet.thumbnails.default)
          .url,
        artist_extra_info: {
          youtube: {
            channel_id: i.snippet.channelId
          }
        }
      })
    }

    return artists
  }

  public async searchArtists(term: string): Promise<Artists[]> {
    const artists: Artists[] = []

    const resp = await this.populateRequest(ApiResources.SEARCH, {
      params: {
        part: ['id', 'snippet'],
        type: 'channel',
        maxResults: 50,
        order: 'relevance',
        q: term
      }
    })

    artists.push(...this.parseSearchArtist(...resp.items))

    return artists
  }

  private parseSearchPlaylists(...items: YoutubeResponses.SearchDetails.Item[]) {
    const playlists: Playlist[] = []

    for (const i of items) {
      playlists.push({
        playlist_id: `youtube-playlist:${i.id.playlistId}`,
        playlist_name: i.snippet.title,
        playlist_coverPath: (i.snippet.thumbnails.maxres ?? i.snippet.thumbnails.high ?? i.snippet.thumbnails.default)
          .url,
        playlist_desc: i.snippet.description
      })
    }

    return playlists
  }

  public async searchPlaylists(term: string): Promise<Playlist[]> {
    const playlists: Playlist[] = []

    const resp = await this.populateRequest(ApiResources.SEARCH, {
      params: {
        part: ['id', 'snippet'],
        type: 'playlist',
        maxResults: 50,
        order: 'relevance',
        q: term
      }
    })

    playlists.push(...this.parseSearchPlaylists(...resp.items))

    return playlists
  }

  public async searchAlbum(term: string): Promise<Album[]> {
    return []
  }
}
