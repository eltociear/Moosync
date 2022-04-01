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
import ytsr from 'ytsr'

interface YTMusicWMatchIndex extends ytMusic.MusicVideo {
  matchIndex: number
}

export class YTScraper extends CacheHandler {
  constructor() {
    super(path.join(app.getPath('cache'), app.getName(), 'youtube.cache'))
  }

  public async searchTerm(title: string, artists?: string[]) {
    // const cached = this.getCache(term + '-search')
    // if (cached) {
    //   return JSON.parse(cached)
    // }

    console.log('searching')

    const term = `${artists ? artists.join(', ') + ' - ' : ''}${title}`
    try {
      const ytMusicSearches = await this.scrapeYTMusic(title, artists)
      if (ytMusicSearches.length === 0) {
        ytMusicSearches.push(...(await this.scrapeYoutube(title, artists)))
      }

      this.addToCache(term + '-search', JSON.stringify(ytMusicSearches))
      return ytMusicSearches
    } catch (e) {
      console.error('Failed to fetch search results from Youtube', e)
    }
  }

  private async scrapeYTMusic(title: string, artists?: string[]) {
    const term = `${artists ? artists.join(', ') + ' - ' : ''}${title}`

    const resp = await ytMusic.searchMusics(term)
    const ytMusicSearches = this.sortByMatches(title, resp)

    return ytMusicSearches
  }

  private async scrapeYoutube(title: string, artists?: string[]) {
    const term = `${artists ? artists.join(', ') + ' - ' : ''}${title}`
    console.log(term)

    const resp = await ytsr(term, { limit: 5 })
    const songs: ytMusic.MusicVideo[] = []
    for (const vid of resp.items) {
      if (vid.type === 'video') {
        songs.push({
          youtubeId: vid.id,
          title: vid.title,
          thumbnailUrl: vid.bestThumbnail.url ?? undefined,
          artists: [{ id: vid.author?.channelID, name: vid.author?.name ?? '' }],
          duration: { label: '', totalSeconds: vid.duration ? parseInt(vid.duration) : 0 }
        })
      }
    }
    console.log(songs)

    return this.sortByMatches(title, songs)
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

  private sortByMatches(searchTerm: string, songs: ytMusic.MusicVideo[]) {
    const finalMatches: YTMusicWMatchIndex[] = []

    for (const s of songs) {
      if (s.title) {
        if (s.title.match(new RegExp(searchTerm, 'i'))) {
          finalMatches.push({
            ...s,
            matchIndex: 1
          })
        } else {
          const matchIndex = this.calculateLevenshteinDistance(searchTerm, s.title)
          if (matchIndex > 0.5) {
            finalMatches.push({
              ...s,
              matchIndex
            })
          }
        }
      }
    }

    return finalMatches.sort((a, b) => b.matchIndex - a.matchIndex)
  }

  private calculateLevenshteinDistance(s1: string, s2: string) {
    let longer = s1
    let shorter = s2
    if (s1.length < s2.length) {
      longer = s2
      shorter = s1
    }
    const longerLength = longer.length
    if (longerLength == 0) {
      return 1.0
    }
    return (longerLength - this.editDistance(longer, shorter)) / parseFloat(longerLength.toString())
  }

  private editDistance(s1: string, s2: string) {
    s1 = s1.toLowerCase()
    s2 = s2.toLowerCase()

    const costs = []
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i
      for (let j = 0; j <= s2.length; j++) {
        if (i == 0) costs[j] = j
        else {
          if (j > 0) {
            let newValue = costs[j - 1]
            if (s1.charAt(i - 1) != s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
            costs[j - 1] = lastValue
            lastValue = newValue
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue
    }
    return costs[s2.length]
  }
}
