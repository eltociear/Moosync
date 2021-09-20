/* 
 *  playlists.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { IpcEvents, PlaylistEvents } from './constants'
import { getDisabledPaths, loadPreferences } from '@/utils/main/db/preferences'

import { SongDB } from '@/utils/main/db'
import fs from 'fs'
import path from 'path'
import { v4 } from 'uuid'

export class PlaylistsChannel implements IpcChannelInterface {
  name = IpcEvents.PLAYLIST
  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case PlaylistEvents.ADD_TO_PLAYLIST:
        this.addToPlaylist(event, request)
        break
      case PlaylistEvents.CREATE_PLAYLIST:
        this.createPlaylist(event, request)
        break
      case PlaylistEvents.SAVE_COVER:
        this.saveCoverToFile(event, request)
        break
      case PlaylistEvents.REMOVE_PLAYLIST:
        this.removePlaylist(event, request)
        break
    }
  }

  private createPlaylist(event: Electron.IpcMainEvent, request: IpcRequest) {
    SongDB.createPlaylist(request.params.name, request.params.desc, request.params.imgSrc)
      .then((data) => {
        event.reply(request.responseChannel, data)
      })
      .catch((e) => {
        console.error(e)
        event.reply(request.responseChannel)
      })
  }
  private addToPlaylist(event: Electron.IpcMainEvent, request: IpcRequest) {
    SongDB.addToPlaylist(request.params.playlist_id, ...request.params.song_ids)
      .then((data) => {
        event.reply(request.responseChannel, data)
      })
      .catch((e) => {
        console.error(e)
        event.reply(request.responseChannel)
      })
  }

  private async saveCoverToFile(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.b64) {
      const cacheDir = loadPreferences()!.thumbnailPath
      const filePath = path.join(cacheDir, v4() + ".png")
      if (fs.existsSync(cacheDir)) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } else {
        fs.mkdirSync(cacheDir)
      }
      fs.writeFile(filePath, request.params.b64.replace(/^data:image\/png;base64,/, ""), 'base64', () => {
        event.reply(request.responseChannel, filePath)
      })
      return
    }
    event.reply(request.responseChannel)
  }

  private async removePlaylist(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.playlist_id) {
      await SongDB.removePlaylist(request.params.playlist_id).then(() => event.reply(request.responseChannel))
    }
    event.reply(request.responseChannel)
  }
}
