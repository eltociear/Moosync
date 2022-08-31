import https from 'https'
import { CacheHandler } from './cacheFile'
import path from 'path'
import { app } from 'electron'
import { loadSelectivePreference } from '../db/preferences'

export class InvidiousRequester extends CacheHandler {
  constructor() {
    super(path.join(app.getPath('sessionData'), app.getName(), 'invidious.cache'))
  }

  public async makeInvidiousRequest<K extends InvidiousResponses.InvidiousApiResources>(
    resource: K,
    search: InvidiousResponses.SearchObject<K>,
    authorization?: string | undefined,
    invalidateCache = false
  ) {
    let BASE_URL = loadSelectivePreference<string>('invidious_instance')

    if (BASE_URL) {
      if (!BASE_URL.startsWith('http')) {
        BASE_URL = 'https://' + BASE_URL
      }

      let parsedResource: string = resource
      if (search.params) {
        const matches = resource.matchAll(new RegExp(/\{(.*?)\}/g))
        if (matches) {
          for (const match of matches) {
            parsedResource = parsedResource.replaceAll(match[0], (search.params as { [key: string]: string })[match[1]])
          }
        }
      }

      const url = BASE_URL + '/api/v1/' + parsedResource
      const parsed = new URL(url)
      if (search.params) {
        for (const [key, value] of Object.entries(search.params)) {
          if (typeof value === 'string') parsed.searchParams.set(key, value)
        }
      }

      const resp = await this.get(parsed, authorization, invalidateCache)

      try {
        return JSON.parse(resp)
      } catch (e) {
        return resp
      }
    }
  }

  public parseSongs(items: InvidiousResponses.VideoDetails.Trending[]) {
    const songs: Song[] = []
    for (const s of items) {
      songs.push({
        _id: `youtube:${s.videoId}`,
        title: s.title,
        duration: s.lengthSeconds,
        artists: [
          {
            artist_id: `youtube-author:${s.authorId}`,
            artist_name: s.author
          }
        ],
        date_added: Date.now(),
        song_coverPath_high: s.videoThumbnails.find((val) => val.quality.includes('maxres'))?.url,
        song_coverPath_low: s.videoThumbnails.find((val) => val.quality.includes('medium'))?.url,
        url: s.videoId,
        type: 'YOUTUBE'
      })
    }
    return songs
  }

  private get(parsed: URL, authorization?: string, invalidateCache = false) {
    if (!invalidateCache) {
      const cached = this.getCache(parsed.toString())
      if (cached) {
        return cached
      }
    }

    return new Promise<string>((resolve, reject) => {
      const headers: { [key: string]: string } = { 'Content-Type': 'application/json' }
      if (authorization) {
        headers['Authorization'] = `Bearer ${authorization}`
      }

      const options: https.RequestOptions = {
        path: parsed.pathname + parsed.search,
        hostname: parsed.hostname,
        headers
      }
      const request = https.get(options, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          resolve(data)
          this.addToCache(parsed.toString(), data)
        })
      })

      request.on('error', function (e) {
        reject(e.message)
      })

      request.end()
    })
  }
}
