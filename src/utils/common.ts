/* 
 *  common.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import axios from 'axios';
import { createWriteStream } from 'fs';

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

const iso8601DurationRegex = /(-)?P(?:([.,\d]+)Y)?(?:([.,\d]+)M)?(?:([.,\d]+)W)?(?:([.,\d]+)D)?T(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?/;

export function parseISO8601Duration(duration: string): number {
  const matches = duration.match(iso8601DurationRegex);

  // Don't care about anything over days
  if (matches) {
    return parseInt(matches[8] ?? 0)
      + (parseInt(matches[7] ?? 0) * 60)
      + (parseInt(matches[6] ?? 0) * 60 * 60)
      + (parseInt(matches[5] ?? 0) * 60 * 60 * 24)
  }
  return 0
}

export function humanByteSize(size: number, bitrate = false): string {
  const thresh = bitrate ? 1000 : 1024;
  const dp = 2

  if (Math.abs(size) < thresh) {
    return size + ' B';
  }

  const units = bitrate ? ['kbps', 'Mbps', 'Gbps', 'Tbps', 'Pbps', 'Ebps', 'Zbps', 'Ybps'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10 ** dp;

  do {
    size /= thresh;
    ++u;
  } while (Math.round(Math.abs(size) * r) / r >= thresh && u < units.length - 1);


  return size.toFixed(dp) + ' ' + units[u];
}

export function toRemoteSong(song: Song | null | undefined, connectionID: string): RemoteSong | undefined {
  if (song) {
    if ((song as RemoteSong).senderSocket) {
      return song as RemoteSong
    }

    return {
      ...song,
      senderSocket: connectionID
    }
  }
}