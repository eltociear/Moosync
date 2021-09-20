/* 
 *  scanner.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import * as mm from 'music-metadata'

import { Observable, SubscriptionObserver } from 'observable-fns'
import { Transfer, TransferDescriptor, expose } from 'threads'
import fs, { promises as fsP } from 'fs'

import crypto from 'crypto'
import path from 'path'
import { v4 } from 'uuid'

const audioPatterns = new RegExp('.flac|.mp3|.ogg|.m4a|.webm|.wav|.wv', 'i')

expose({
  start(paths: togglePaths) {
    return new Observable<any>((observer) => {
      start(paths, observer)
    })
  },
})

async function scanFile(filePath: string): Promise<{ song: Song, cover: Buffer | undefined }> {
  const fsStats = await fsP.stat(filePath)
  const hash = await generateChecksum(filePath)

  return processFile({
    path: filePath,
    inode: fsStats.ino.toString(),
    deviceno: fsStats.dev.toString(),
    size: fsStats.size,
    hash: hash,
  })
}

async function processFile(stat: stats): Promise<{ song: Song, cover: Buffer | undefined }> {
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
      album_artist: data.common.albumartist,
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
    date_added: Date.now().toString(),
    type: 'LOCAL',
  }
}

async function scanDir(directory: string, observer: SubscriptionObserver<{ song: Song, cover: TransferDescriptor<Buffer> | undefined }>) {
  if (fs.existsSync(directory)) {
    const files = fs.readdirSync(directory)
    for (const file of files) {
      console.log(file)
      if (fs.statSync(path.join(directory, file)).isDirectory()) {
        await scanDir(path.join(directory, file), observer)
      }
      if (audioPatterns.exec(path.extname(file)) !== null) {
        try {
          const filePath = path.join(directory, file)
          const result = await scanFile(filePath)
          observer.next({ song: result.song, cover: result.cover && Transfer(result.cover) })
        } catch (e) {
          console.error(e)
        }
      }
    }
  } else {
    console.error('invalid directory: ' + directory)
  }
}

async function start(paths: togglePaths, observer: SubscriptionObserver<any>) {
  for (const i in paths) {
    paths[i].enabled && await scanDir(paths[i].path, observer)
  }
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
