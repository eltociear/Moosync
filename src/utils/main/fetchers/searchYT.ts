/*
 *  searchYT.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import * as ytMusic from 'node-youtube-music'

class YTScraper {
  public async searchTerm(term: string) {
    return await ytMusic.searchMusics(term)
  }

  public async getSuggestions(videoID: string) {
    return ytMusic.getSuggestions(videoID)
  }
}

export const ytScraper = new YTScraper()
