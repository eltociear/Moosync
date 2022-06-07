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
import ytdl from 'ytdl-core'

interface YTMusicWMatchIndex extends ytMusic.MusicVideo {
  matchIndex: number
}

export class YTScraper extends CacheHandler {
  constructor() {
    super(path.join(app.getPath('cache'), app.getName(), 'youtube.cache'))
  }

  private getHighResThumbnail(url: string) {
    const urlParts = url.split('=')
    if (urlParts.length === 2) {
      const queryParts = urlParts[1].split('-')
      if (queryParts.length >= 4) {
        queryParts[0] = 'w800'
        queryParts[1] = 'h800'
      }

      return urlParts[0] + '=' + queryParts.join('-')
    }

    return url.replace('w60', 'w800').replace('h60', 'h800').replace('w120', 'w800').replace('h120', 'h800')
  }

  private parseSong(...item: ytMusic.MusicVideo[]): Song[] {
    const songs: Song[] = []
    for (const s of item) {
      const highResThumbnail = s.thumbnailUrl && this.getHighResThumbnail(s.thumbnailUrl)
      songs.push({
        _id: 'youtube:' + s.youtubeId,
        title: s.title ? s.title.trim() : '',
        song_coverPath_high: highResThumbnail,
        song_coverPath_low: s.thumbnailUrl,
        album: {
          album_name: s.album ? s.album.trim() : '',
          album_coverPath_high: highResThumbnail,
          album_coverPath_low: s.thumbnailUrl
        },
        artists:
          s.artists?.map((val) => ({
            artist_id: `youtube-author:${val.id}`,
            artist_name: val.name
          })) ?? [],
        duration: s.duration?.totalSeconds ?? 0,
        url: s.youtubeId,
        date_added: Date.now(),
        type: 'YOUTUBE'
      })
    }

    return songs
  }

  public async searchTerm(
    title: string,
    artists?: string[],
    matchTitle = true,
    scrapeYTMusic = true,
    scrapeYoutube = false
  ): Promise<Song[]> {
    const term = `${artists ? artists.join(', ') + ' - ' : ''}${title}`

    const cached = this.getCache(term + '-search')
    if (cached) {
      return this.parseSong(...JSON.parse(cached))
    }

    const promises = []
    const res: ytMusic.MusicVideo[] = []
    try {
      scrapeYTMusic && promises.push(this.scrapeYTMusic(title, artists, matchTitle).then((data) => res.push(...data)))
      scrapeYoutube && promises.push(this.scrapeYoutube(title, artists, matchTitle).then((data) => res.push(...data)))

      await Promise.all(promises)

      this.addToCache(term + '-search', JSON.stringify(res))
      return this.parseSong(...res)
    } catch (e) {
      console.error('Failed to fetch search results from Youtube', e)
    }

    return []
  }

  private async scrapeYTMusic(title: string, artists?: string[], matchTitle = true) {
    const term = `${artists ? artists.join(', ') + ' - ' : ''}${title}`

    const resp = await ytMusic.searchMusics(term)
    const ytMusicSearches = matchTitle ? this.sortByMatches(title, resp) : resp

    return ytMusicSearches
  }

  private parseYoutubeDuration(dur: string) {
    const split = dur.split(':')
    let ret = 0
    for (let i = split.length - 1; i >= 0; i--) {
      ret += parseInt(split[i]) * Math.pow(60, split.length - i - 1)
    }
    return ret
  }

  private async scrapeYoutube(title: string, artists?: string[], matchTitle = true) {
    const term = `${artists ? artists.join(', ') + ' - ' : ''}${title}`

    const resp = await ytsr(term)
    const songs: ytMusic.MusicVideo[] = []
    for (const vid of resp.items) {
      if (vid.type === 'video') {
        songs.push({
          youtubeId: vid.id,
          title: vid.title,
          thumbnailUrl: vid.bestThumbnail.url ?? undefined,
          artists: [{ id: vid.author?.channelID, name: vid.author?.name ?? '' }],
          duration: { label: '', totalSeconds: vid.duration ? this.parseYoutubeDuration(vid.duration ?? '') : 0 }
        })
      }
    }

    return matchTitle ? this.sortByMatches(title, songs) : songs
  }

  public async getSuggestions(videoID: string) {
    const cached = this.getCache(videoID)
    if (cached) {
      return this.parseSong(...JSON.parse(cached))
    }

    try {
      const resp = await ytMusic.getSuggestions(videoID)
      this.addToCache(videoID, JSON.stringify(resp))
      return this.parseSong(...resp)
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

  public async getWatchURL(id: string) {
    const cache = this.getCache(`watchURL:${id}`)
    if (cache) {
      return cache
    }

    const data = await ytdl.getInfo(id)

    let format
    try {
      format = ytdl.chooseFormat(data.formats, {
        quality: 'highestaudio'
      })
    } catch (e) {
      format = ytdl.chooseFormat(data.formats, {})
    }

    try {
      const expiry = parseInt(new URL(format.url).searchParams.get('expire') ?? '0') * 1000
      expiry > 0 && this.addToCache(`watchURL:${id}`, format.url, expiry)
    } catch (e) {
      console.warn('Failed to add watch URL to cache', format.url)
    }
    return format.url
  }
}
