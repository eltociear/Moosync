/*
 *  lastfm.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import https from 'https'
import path from 'path'
import { CacheHandler } from './cacheFile'
import { app } from 'electron'

export class LastFMScraper extends CacheHandler {
  constructor() {
    super(path.join(app.getPath('sessionData'), app.getName(), 'lastfm.cache'))
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
}
