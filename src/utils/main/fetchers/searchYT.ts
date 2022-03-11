/*
 *  searchYT.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import * as ytMusic from 'node-youtube-music'

export class YTScraper {
  public async searchTerm(term: string) {
    try {
      return await ytMusic.searchMusics(term)
    } catch (e) {
      console.error('Failed to fetch search results from Youtube', e)
    }
  }

  public async getSuggestions(videoID: string) {
    try {
      return ytMusic.getSuggestions(videoID)
    } catch (e) {
      console.error('Failed to fetch suggestions from Youtube', e)
    }

    return []
  }
}
