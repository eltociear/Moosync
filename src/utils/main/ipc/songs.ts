/* 
 *  songs.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { IpcEvents, SongEvents } from './constants'
import { getDisabledPaths, loadPreferences } from '@/utils/main/db/preferences'

import { SongDB } from '../db'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export class SongsChannel implements IpcChannelInterface {
  name = IpcEvents.SONG
  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case SongEvents.STORE_SONG:
        this.storeSongs(event, request)
        break
      case SongEvents.REMOVE_SONG:
        this.removeSongs(event, request)
        break
      case SongEvents.SAVE_AUDIO_TO_FILE:
        this.saveAudioToFile(event, request)
        break
      case SongEvents.SAVE_IMAGE_TO_FILE:
        this.saveImageToFile(event, request)
        break
      case SongEvents.AUDIO_EXISTS:
        this.fileExists(event, request, 'audio')
        break
      case SongEvents.IMAGE_EXISTS:
        this.fileExists(event, request, 'image')
        break
    }
  }

  private removeSongs(event: Electron.IpcMainEvent, request: IpcRequest) {
    const promises: Promise<void>[] = []
    if (request.params.songs) {
      const songs = request.params.songs as Song[]
      for (const s of songs) {
        promises.push(SongDB.removeSong(s._id!))
      }
    }
    Promise.all(promises)
      .then((data) => {
        event.reply(request.responseChannel, data)
      })
      .catch((e) => {
        console.error(e)
        event.reply(request.responseChannel)
      })
  }

  private storeSongs(event: Electron.IpcMainEvent, request: IpcRequest) {
    const promises: Promise<void>[] = []
    if (request.params.songs) {
      const songs = request.params.songs as Song[]
      for (const s of songs) {
        promises.push(SongDB.store(s))
      }
    }
    Promise.all(promises)
      .then((data) => {
        event.reply(request.responseChannel, data)
      })
      .catch((e) => {
        console.error(e)
        event.reply(request.responseChannel)
      })
  }

  private saveAudioToFile(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.path && request.params.blob) {
      const cacheDir = path.join(app.getPath('cache'), app.getName(), 'audioCache')
      const filePath = path.join(cacheDir, request.params.path)
      if (fs.existsSync(cacheDir)) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } else {
        fs.mkdirSync(cacheDir)
      }
      fs.writeFile(filePath, request.params.blob, () => {
        event.reply(request.responseChannel, filePath)
      })
      return
    }
    event.reply(request.responseChannel)
  }

  private saveImageToFile(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.path && request.params.blob) {
      const cacheDir = path.join(app.getPath('cache'), app.getName(), 'imageCache')
      const filePath = path.join(cacheDir, request.params.path)
      if (fs.existsSync(cacheDir)) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } else {
        fs.mkdirSync(cacheDir)
      }
      fs.writeFile(filePath, request.params.blob, () => {
        event.reply(request.responseChannel, filePath)
      })
      return
    }
    event.reply(request.responseChannel)
  }

  private fileExists(event: Electron.IpcMainEvent, request: IpcRequest, type: 'audio' | 'image') {
    if (request.params.path) {
      let filePath: string
      switch (type) {
        case 'audio':
          filePath = path.join(app.getPath('cache'), app.getName(), 'audioCache', request.params.path)
          break
        case 'image':
          filePath = path.join(app.getPath('cache'), app.getName(), '.thumbnails', request.params.path)
          break
      }
      event.reply(request.responseChannel, fs.existsSync(filePath) ? filePath : undefined)
    }
    event.reply(request.responseChannel)
  }
}
