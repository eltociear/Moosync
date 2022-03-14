/*
 *  lastfm.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { app } from 'electron'
import { promises as fsP } from 'fs'
import https from 'https'
import path from 'path'

const CachePath = path.join(app.getPath('cache'), 'lastfm_cache')

type Cache = { [key: string]: { expiry: number; data: string } }

class WebScraper {
  private cache: Cache = {}

  constructor() {
    this.readCache()
  }

  private async dumpCache() {
    this.makeCacheDir()

    return fsP.writeFile(CachePath, JSON.stringify(this.cache), { encoding: 'utf-8' })
  }

  private async readCache() {
    this.makeCacheDir()

    const data = await fsP.readFile(CachePath, { encoding: 'utf-8' })
    this.cache = JSON.parse(data)
  }

  private async addToCache(url: string, data: string) {
    if (JSON.parse(data)) {
      const expiry = Date.now() + 2 * 60 * 60 * 1000
      this.cache[url] = { expiry, data }
      await this.dumpCache()
    }
  }

  private getCache(url: string): string | undefined {
    const data = this.cache[url]
    if (data && data.expiry > Date.now()) {
      return data.data
    }
  }

  public async scrapeURL(url: string): Promise<string> {
    const cached = this.getCache(url)
    if (cached) {
      return cached
    }
    return new Promise<string>((resolve, reject) => {
      if (url.startsWith('https')) {
        const request = https.request(new URL(url), (res) => {
          let data = ''
          res.on('data', (chunk) => {
            data += chunk
          })
          res.on('end', () => {
            resolve(data)
            this.addToCache(url, data)
          })
        })

        request.on('error', function (e) {
          reject(e.message)
        })

        request.end()
      } else {
        reject('URL must start with https: ' + url)
      }
    })
  }

  private async makeCacheDir() {
    try {
      await fsP.access(CachePath)
    } catch (_) {
      await fsP.mkdir(CachePath, { recursive: true })
    }
  }
}

export const webScraper = new WebScraper()
