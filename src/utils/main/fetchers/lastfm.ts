/* 
 *  lastfm.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { _windowHandler } from '../../../background';
import { app } from 'electron';
import https from 'https'
import pie from "puppeteer-in-electron";
import puppeteer from "puppeteer-core";

class WebScraper {
  public async scrapeURL(url: string): Promise<any> {
    // console.log('scraping')
    // const browser = await pie.connect(app, puppeteer);

    // const window = _windowHandler.createScrapeWindow()
    // await window.loadURL(url);

    // const page = await pie.getPage(browser, window);
    // console.log(page.get);
    return new Promise<any>((resolve, reject) => {
      if (url.startsWith('https')) {
        const request = https.request(new URL(url), (res) => {
          let data = ''
          res.on('data', (chunk) => {
            data += chunk;
          })
          res.on('end', () => {
            resolve(data)
          })
        })

        request.on('error', function (e) {
          reject(e.message);
        })

        request.end()
      } else {
        reject('URL must start with https: ' + url)
      }
    })

  }
}

export const webScraper = new WebScraper()
