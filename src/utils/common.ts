/*
 *  common.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import axios from 'axios'
import { createWriteStream } from 'fs'

export function arrayDiff<T>(arr1: T[], arr2: T[]) {
  return arr1.filter((x) => !arr2.includes(x))
}

export function convertDuration(n: number) {
  if (n) {
    const tmp = new Date(n * 1000).toISOString().substring(11, 19)

    if (tmp[0] == '0' && tmp[1] == '0') {
      return tmp.substring(3)
    }

    return tmp
  }
  return 0
}

export function getVersion(verS: string) {
  try {
    return parseInt(verS.split('.').join(''))
  } catch (e) {
    console.warn('Failed to parse', verS, '. Please use x.y.z as extension versioning format', e)
  }

  return 0
}

export function sortSongList(songList: Song[], options: SongSortOptions): Song[] {
  return songList.sort((a, b) => {
    const field: keyof Song = options.type as keyof Song
    const first = a[field]
    const second = b[field]

    if (first && second) {
      if (!options.asc) {
        return second.toString().localeCompare(first.toString())
      } else {
        return first.toString().localeCompare(second.toString())
      }
    }

    return 0
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

const iso8601DurationRegex =
  /(-)?P(?:([.,\d]+)Y)?(?:([.,\d]+)M)?(?:([.,\d]+)W)?(?:([.,\d]+)D)?T(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?/

export function parseISO8601Duration(duration: string): number {
  const matches = duration.match(iso8601DurationRegex)

  // Don't care about anything over days
  if (matches) {
    return (
      parseInt(matches[8] ?? 0) +
      parseInt(matches[7] ?? 0) * 60 +
      parseInt(matches[6] ?? 0) * 60 * 60 +
      parseInt(matches[5] ?? 0) * 60 * 60 * 24
    )
  }
  return 0
}

export function humanByteSize(size: number, bitrate = false): string {
  const thresh = bitrate ? 1000 : 1024
  const dp = 2

  if (Math.abs(size) < thresh) {
    return size + ' B'
  }

  const units = bitrate
    ? ['kbps', 'Mbps', 'Gbps', 'Tbps', 'Pbps', 'Ebps', 'Zbps', 'Ybps']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
  let u = -1
  const r = 10 ** dp

  do {
    size /= thresh
    ++u
  } while (Math.round(Math.abs(size) * r) / r >= thresh && u < units.length - 1)

  return size.toFixed(dp) + ' ' + units[u]
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

export function stripSong(song?: RemoteSong): RemoteSong {
  const tmp: RemoteSong = JSON.parse(JSON.stringify(song))
  delete tmp.path
  delete tmp.lyrics

  if (tmp.album) {
    // If the image is hosted somewhere then surely the client on the other end can load it... right?
    if (!tmp.album?.album_coverPath_low?.startsWith('http')) delete tmp.album.album_coverPath_low

    if (!tmp.album?.album_coverPath_high?.startsWith('http')) delete tmp.album.album_coverPath_high
  }

  if (!tmp.song_coverPath_low?.startsWith('http')) delete tmp.song_coverPath_low

  if (!tmp.song_coverPath_high?.startsWith('http')) delete tmp.song_coverPath_high

  return tmp
}

export function getErrorMessage(...args: unknown[]) {
  const ret = []
  for (const data of args) {
    if (data instanceof Error) {
      ret.push(data.name)
      ret.push(data.message)
      ret.push(data.stack)
    } else {
      ret.push(data)
    }
  }

  return ret
}

export function sanitizeArtistName(name: string, capitalize = false) {
  let sanitized = name
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replaceAll('vevo', '')

  if (capitalize) {
    const toTitleCase = (str: string) => {
      return str
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }
    sanitized = toTitleCase(sanitized)
  }

  return sanitized
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dotIndex(obj: any, is: string | string[], value?: unknown): unknown {
  if (typeof is == 'string') return dotIndex(obj, is.split('.'), value)
  else if (is.length == 1 && value !== undefined) return (obj[is[0]] = value)
  else if (is.length == 0) return obj
  else return dotIndex(obj[is[0]], is.slice(1), value)
}

function isObject(item: object): boolean {
  return item && typeof item === 'object' && !Array.isArray(item)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeDeep(target: Record<string, unknown>, ...sources: any[]): Record<string, unknown> {
  if (!sources.length) return target
  const source = sources.shift()

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} })
        mergeDeep(target[key] as Record<string, unknown>, source[key])
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    }
  }

  return mergeDeep(target, ...sources)
}
