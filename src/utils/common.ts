/* 
 *  common.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import axios from 'axios';
import { createWriteStream, unlinkSync } from 'fs';

export function arrayDiff(arr1: any[], arr2: any[]) {
  return arr1.filter(x => !arr2.includes(x));
}

export function convertDuration(n: number) {
  const tmp = new Date(n * 1000).toISOString().substr(11, 8)

  if (tmp[0] == '0' && tmp[1] == '0') {
    return tmp.substr(3)
  }

  return tmp
}

export function getVersion(verS: string) {
  return verS.split('').map(x => x.charCodeAt(0)).reduce((a, b) => a + b)
}

export function sortSongList(songList: Song[], options: sortOptions) {
  songList.sort((a, b) => {
    let field: keyof Song = 'title'
    if (options.type === 'name') {
      field = 'title'
    } else if (options.type === 'date') {
      field = 'date_added'
    }
    let compare = a[field].localeCompare(b[field])
    if (!options.asc) {
      compare = -compare
    }
    return compare
  })
}

export async function downloadFile(url: string, dest: string) {
  const file = createWriteStream(dest)
  const resp = await axios({
    url,
    responseType: 'stream'
  })

  return new Promise<void>((resolve, reject) => {
    resp.data.pipe(file).on('finish', resolve).on('error', reject)
  })
} 