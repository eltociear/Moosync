/*
 *  scanner.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import * as mm from 'music-metadata'

import { Observable, SubscriptionObserver } from 'observable-fns'
import { Transfer, TransferDescriptor } from 'threads'
import { expose } from 'threads/worker'
import fs, { promises as fsP } from 'fs'

import crypto from 'crypto'
import path from 'path'
import { v4 } from 'uuid'
import { XMLParser } from 'fast-xml-parser'
import readline from 'readline'
import { fileURLToPath } from 'url'

const audioPatterns = new RegExp('.flac|.mp3|.ogg|.m4a|.webm|.wav|.wv|.aac', 'i')
const playlistPatterns = new RegExp('.m3u|.m3u8|.wpl')

type ScannedSong = { song: Song; cover: Buffer | undefined | TransferDescriptor<Buffer> }
type ScannedPlaylist = { filePath: string; title: string; songHashes: string[] }

let parser: XMLParser | undefined

expose({
  start(paths: togglePaths) {
    return new Observable((observer) => {
      startScan(paths, observer)
    })
  }
})

async function scanFile(filePath: string): Promise<ScannedSong> {
  const fsStats = await fsP.stat(filePath)
  const hash = await generateChecksum(filePath)

  return processFile({
    path: filePath,
    inode: fsStats.ino.toString(),
    deviceno: fsStats.dev.toString(),
    size: fsStats.size,
    hash: hash
  })
}

function createXMLParser() {
  if (!parser) {
    parser = new XMLParser({ ignoreAttributes: false })
  }
}

async function parseWPL(filePath: string) {
  console.debug('parsing wpl')
  const data = parser?.parse(await fsP.readFile(filePath), {})
  const songs: string[] = []
  let title = ''

  if (data['smil']) {
    if (data['smil']['body'] && data['smil']['body']['seq']) {
      const media = data['smil']['body']['seq']['media']
      if (media) {
        if (Array.isArray(media)) {
          for (const m of media) {
            songs.push(m['@_src'])
          }
        } else {
          songs.push(media['@_src'])
        }
      }
    }

    if (data['smil']['head']) {
      title = data['smil']['head']['title']
    }
  }

  return { title, songs }
}

async function processLineByLine(filePath: string, callback: (data: string, index: number) => Promise<boolean>) {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity
  })

  let i = 0
  for await (const line of rl) {
    const res = await callback(line, i)
    i++

    if (!res) {
      break
    }
  }
}

async function parseM3U(filePath: string) {
  console.debug('Parsing m3u')
  const songs: string[] = []
  let title = ''
  await processLineByLine(filePath, async (data, index) => {
    console.debug('Parsing line', index, data)
    if (index === 0) {
      return data === '#EXTM3U'
    }

    if (!data.startsWith('#')) {
      const songPath = path.resolve(filePath, data.startsWith('file') ? fileURLToPath(data) : data)
      songs.push(songPath)
    } else if (data.startsWith('#PLAYLIST')) {
      title = data.replace('#PLAYLIST:', '')
    }

    return true
  })
  return { songs, title }
}

async function scanPlaylist(filePath: string) {
  createXMLParser()
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.wpl':
      return parseWPL(filePath)
    case '.m3u':
    case '.m3u8':
      return parseM3U(filePath)
  }
}

async function processFile(stat: stats): Promise<ScannedSong> {
  const metadata = await mm.parseFile(stat.path)
  const info = await getInfo(metadata, stat)
  const cover = metadata.common.picture && metadata.common.picture[0].data
  return { song: info, cover }
}

async function getInfo(data: mm.IAudioMetadata, stats: stats): Promise<Song> {
  const artists: string[] = []
  if (data.common.artists) {
    for (const a of data.common.artists) {
      artists.push(...a.split(/[,&]+/))
    }
  }

  return {
    _id: v4(),
    title: data.common.title ? data.common.title : path.basename(stats.path).split('.').slice(0, -1).join('.').trim(),
    path: stats.path,
    size: stats.size,
    album: {
      album_name: data.common.album,
      album_song_count: 0,
      year: data.common.year,
      album_artist: data.common.albumartist
    },
    artists: artists,
    date: data.common.date,
    year: data.common.year,
    genre: data.common.genre,
    lyrics: data.common.lyrics ? data.common.lyrics[0] : undefined,
    releaseType: data.common.releasetype,
    bitrate: data.format.bitrate,
    codec: data.format.codec,
    container: data.format.container,
    duration: data.format.duration || 0,
    sampleRate: data.format.sampleRate,
    hash: stats.hash,
    inode: stats.inode,
    deviceno: stats.deviceno,
    date_added: Date.now(),
    type: 'LOCAL'
  }
}

async function scanDir(directory: string, observer: SubscriptionObserver<ScannedSong | ScannedPlaylist>) {
  if (fs.existsSync(directory)) {
    const files = fs.readdirSync(directory)
    for (const file of files) {
      if (fs.statSync(path.join(directory, file)).isDirectory()) {
        await scanDir(path.join(directory, file), observer)
      }

      const filePath = path.join(directory, file)
      if (audioPatterns.exec(path.extname(file).toLowerCase())) {
        console.debug('Scanning song', filePath)
        try {
          const result = await scanFile(filePath)
          observer.next({ song: result.song, cover: result.cover && Transfer(result.cover as Buffer) })
        } catch (e) {
          console.error(e)
        }
      }

      if (playlistPatterns.exec(path.extname(file).toLowerCase())) {
        console.debug('Scanning playlist', filePath)
        const result = await scanPlaylist(filePath)
        const songHashes: string[] = []
        if (result?.songs) {
          for (const songPath of result.songs) {
            try {
              const result = await scanFile(songPath)
              if (result.song.hash) {
                observer.next({ song: result.song, cover: result.cover && Transfer(result.cover as Buffer) })
                songHashes.push(result.song.hash)
              }
            } catch (e) {
              console.error(e)
            }
          }
          console.debug('Sending playlist data to main process')
          observer.next({ title: result.title, songHashes: songHashes, filePath })
        }
      }
    }
  } else {
    console.error('invalid directory: ' + directory)
  }
}

async function startScan(paths: togglePaths, observer: SubscriptionObserver<unknown>) {
  for (const i in paths) {
    paths[i].enabled && (await scanDir(paths[i].path, observer))
  }
  console.debug('Scan complete')
  observer.complete()
}

async function generateChecksum(file: string): Promise<string> {
  return new Promise((resolve) => {
    const hash = crypto.createHash('md5')
    const fileStream = fs.createReadStream(file, { highWaterMark: 256 * 1024 })
    fileStream.on('data', (data) => {
      hash.update(data)
    })
    fileStream.on('end', function () {
      resolve(hash.digest('hex'))
    })
  })
}
