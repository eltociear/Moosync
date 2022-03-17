/*
 *  searchYT.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import * as ytMusic from 'node-youtube-music'
import { app } from 'electron'
import path from 'path'
import { CacheHandler } from './cacheFile'

export class YTScraper extends CacheHandler {
  constructor() {
    super(path.join(app.getPath('cache'), app.getName(), 'youtube.cache'))
  }

  public async searchTerm(term: string) {
    const cached = this.getCache(term + '-search')
    if (cached) {
      return JSON.parse(cached)
    }

    try {
      const resp = await ytMusic.searchMusics(term)
      this.addToCache(term + '-search', JSON.stringify(resp))
      return resp
    } catch (e) {
      console.error('Failed to fetch search results from Youtube', e)
    }
  }

  public async getSuggestions(videoID: string) {
    const cached = this.getCache(videoID)
    if (cached) {
      return JSON.parse(cached)
    }

    try {
      const resp = await ytMusic.getSuggestions(videoID)
      this.addToCache(videoID, JSON.stringify(resp))
      return resp
    } catch (e) {
      console.error('Failed to fetch suggestions from Youtube', e)
    }

    return []
  }
}
