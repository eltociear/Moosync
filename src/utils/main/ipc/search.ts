/*
 *  search.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { IpcEvents, SearchEvents } from './constants'
import { getDisabledPaths, loadPreferences } from '@/utils/main/db/preferences'

import { SongDB } from '@/utils/main/db'
import { YTScraper } from '../fetchers/searchYT'
import { AZLyricsFetcher } from '../fetchers/lyrics'
import { LastFMScraper } from '../fetchers/lastfm'
import { InvidiousRequester } from '../fetchers/invidious'
import { loadSelectivePreference } from '../db/preferences'
import { InvidiousApiResources } from '@/utils/commonConstants'

export class SearchChannel implements IpcChannelInterface {
  name = IpcEvents.SEARCH
  private ytScraper = new YTScraper()
  private lastFmScraper = new LastFMScraper()
  private invidiousRequester = new InvidiousRequester()
  private azLyricsFetcher = new AZLyricsFetcher()

  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case SearchEvents.SEARCH_SONGS_BY_OPTIONS:
        this.searchSongByOptions(event, request as IpcRequest<SearchRequests.SongOptions>)
        break
      case SearchEvents.SEARCH_ALL:
        this.searchAll(event, request as IpcRequest<SearchRequests.Search>)
        break
      case SearchEvents.SEARCH_YT:
        this.searchYT(event, request as IpcRequest<SearchRequests.SearchYT>)
        break
      case SearchEvents.YT_SUGGESTIONS:
        this.getYTSuggestions(event, request as IpcRequest<SearchRequests.YTSuggestions>)
        break
      case SearchEvents.SEARCH_ENTITY_BY_OPTIONS:
        this.searchEntityByOptions(event, request as IpcRequest<SearchRequests.EntityOptions>)
        break
      case SearchEvents.SCRAPE_LASTFM:
        this.scrapeLastFM(event, request as IpcRequest<SearchRequests.LastFMSuggestions>)
        break
      case SearchEvents.SCRAPE_LYRICS:
        this.scrapeLyrics(event, request as IpcRequest<SearchRequests.LyricsScrape>)
        break
      case SearchEvents.REQUEST_INVIDIOUS:
        this.requestIndivious(event, request as IpcRequest<SearchRequests.InvidiousRequest>)
        break
    }
  }

  private async searchAll(event: Electron.IpcMainEvent, request: IpcRequest<SearchRequests.Search>) {
    const preferences = loadPreferences()
    if (request.params && request.params.searchTerm) {
      event.reply(
        request.responseChannel,
        SongDB.searchAll(request.params.searchTerm, getDisabledPaths(preferences.musicPaths))
      )
    }
    event.reply(request.responseChannel)
  }

  private async searchYT(event: Electron.IpcMainEvent, request: IpcRequest<SearchRequests.SearchYT>) {
    if (request.params && request.params.title) {
      try {
        const useInvidious =
          loadSelectivePreference<SystemSettings[]>('system', false, [])?.find((val) => val.key === 'use_invidious')
            ?.enabled ?? false

        let data
        if (!useInvidious) {
          data = await this.ytScraper.searchTerm(
            request.params.title,
            request.params.artists,
            request.params.matchTitle,
            request.params.scrapeYTMusic,
            request.params.scrapeYoutube
          )
        } else {
          const searchTerm = `${request.params.artists ? request.params.artists.join(', ') + ' - ' : ''}${
            request.params.title
          }`
          const resp = await this.invidiousRequester.makeInvidiousRequest(InvidiousApiResources.SEARCH, {
            params: { q: searchTerm, type: 'video', sort_by: 'relevance' }
          })

          if (resp) data = this.invidiousRequester.parseSongs(resp)
        }
        event.reply(request.responseChannel, data)
      } catch (e) {
        console.error(e)
      }
    }
    event.reply(request.responseChannel)
  }

  private getYTSuggestions(event: Electron.IpcMainEvent, request: IpcRequest<SearchRequests.YTSuggestions>) {
    if (request.params && request.params.videoID) {
      this.ytScraper
        .getSuggestions(request.params.videoID)
        .then((data) => event.reply(request.responseChannel, data))
        .catch((e) => {
          console.error(e)
          event.reply(request.responseChannel, [])
        })
    }
  }

  private searchSongByOptions(event: Electron.IpcMainEvent, request: IpcRequest<SearchRequests.SongOptions>) {
    const preferences = loadPreferences()
    const data = SongDB.getSongByOptions(request.params.options, getDisabledPaths(preferences.musicPaths))
    event.reply(request.responseChannel, data)
  }

  private async searchEntityByOptions(event: Electron.IpcMainEvent, request: IpcRequest<SearchRequests.EntityOptions>) {
    if (request.params && request.params.options) {
      event.reply(request.responseChannel, SongDB.getEntityByOptions(request.params.options))
    }
  }

  private async scrapeLastFM(event: Electron.IpcMainEvent, request: IpcRequest<SearchRequests.LastFMSuggestions>) {
    if (request.params && request.params.url) {
      const resp = await this.lastFmScraper.scrapeURL(request.params.url)
      event.reply(request.responseChannel, resp)
    }
  }

  private async scrapeLyrics(event: Electron.IpcMainEvent, request: IpcRequest<SearchRequests.LyricsScrape>) {
    if (request.params && request.params.artists && request.params.title) {
      const resp = await this.azLyricsFetcher.getLyrics(request.params.artists, request.params.title)
      event.reply(request.responseChannel, resp)
    }
  }

  private async requestIndivious(event: Electron.IpcMainEvent, request: IpcRequest<SearchRequests.InvidiousRequest>) {
    if (request.params.resource && request.params.search) {
      const resp = await this.invidiousRequester.makeInvidiousRequest(
        request.params.resource,
        request.params.search,
        request.params.authorization,
        request.params.invalidateCache
      )
      event.reply(request.responseChannel, resp)
    }
    event.reply(request.responseChannel)
  }
}
