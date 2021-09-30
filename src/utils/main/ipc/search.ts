/* 
 *  search.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { IpcEvents, SearchEvents } from './constants'
import { getDisabledPaths, loadPreferences } from '@/utils/main/db/preferences'

import { SongDB } from '@/utils/main/db'
import { webScraper } from '../fetchers/lastfm';
import { ytScraper } from '@/utils/main/fetchers/searchYT'

export class SearchChannel implements IpcChannelInterface {
  name = IpcEvents.SEARCH
  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case SearchEvents.SEARCH_SONGS_BY_OPTIONS:
        this.searchSongByOptions(event, request)
        break
      case SearchEvents.SEARCH_ALL:
        this.searchAll(event, request)
        break
      case SearchEvents.SEARCH_YT:
        this.searchYT(event, request)
        break
      case SearchEvents.YT_SUGGESTIONS:
        this.getYTSuggestions(event, request)
        break
      case SearchEvents.SEARCH_ENTITY_BY_OPTIONS:
        this.searchEntityByOptions(event, request)
        break
      case SearchEvents.SCRAPE_LASTFM:
        this.scrapeLastFM(event, request)
        break
    }
  }

  private async searchAll(event: Electron.IpcMainEvent, request: IpcRequest) {
    const preferences = loadPreferences()
    if (request.params && request.params.searchTerm) {
      SongDB.searchAll(request.params.searchTerm, getDisabledPaths(preferences.musicPaths))
        .then((data) => {
          event.reply(request.responseChannel, data)
        })
        .catch((e) => {
          console.error(e)
          event.reply(request.responseChannel)
        })
    }
  }

  private searchYT(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params && request.params.searchTerm) {
      ytScraper
        .searchTerm(request.params.searchTerm)
        .then((data) => event.reply(request.responseChannel, data))
        .catch((e) => {
          console.error(e)
          event.reply(request.responseChannel)
        })
    }
  }

  private getYTSuggestions(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params && request.params.videoID) {
      ytScraper
        .getSuggestions(request.params.videoID)
        .then((data) => event.reply(request.responseChannel, data))
        .catch((e) => {
          console.error(e)
          event.reply(request.responseChannel, [])
        })
    }
  }

  private async searchSongByOptions(event: Electron.IpcMainEvent, request: IpcRequest) {
    const preferences = loadPreferences()
    const data = SongDB.getSongByOptions(request.params.options, getDisabledPaths(preferences.musicPaths))
    event.reply(request.responseChannel, data)
  }

  private async searchEntityByOptions(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params && request.params.options) {
      event.reply(request.responseChannel, SongDB.getEntityByOptions(request.params.options))
    }
  }

  private async scrapeLastFM(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params && request.params.url) {
      const resp = await webScraper.scrapeURL(request.params.url)
      event.reply(request.responseChannel, resp)
    }
  }
}
