/*
 *  playlists.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { IpcEvents, PlaylistEvents } from './constants'
import { loadPreferences } from '@/utils/main/db/preferences'

import { SongDB } from '@/utils/main/db'
import fs from 'fs'
import path from 'path'
import { v4 } from 'uuid'
import { _windowHandler } from '../windowManager'
import { writeFile } from 'fs/promises'

export class PlaylistsChannel implements IpcChannelInterface {
  name = IpcEvents.PLAYLIST
  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case PlaylistEvents.ADD_TO_PLAYLIST:
        this.addToPlaylist(event, request as IpcRequest<PlaylistRequests.AddToPlaylist>)
        break
      case PlaylistEvents.CREATE_PLAYLIST:
        this.createPlaylist(event, request as IpcRequest<PlaylistRequests.CreatePlaylist>)
        break
      case PlaylistEvents.SAVE_COVER:
        this.saveCoverToFile(event, request as IpcRequest<PlaylistRequests.SaveCover>)
        break
      case PlaylistEvents.REMOVE_PLAYLIST:
        this.removePlaylist(event, request as IpcRequest<PlaylistRequests.RemoveExportPlaylist>)
        break
      case PlaylistEvents.EXPORT:
        this.exportPlaylist(event, request as IpcRequest<PlaylistRequests.RemoveExportPlaylist>)
        break
    }
  }

  private createPlaylist(event: Electron.IpcMainEvent, request: IpcRequest<PlaylistRequests.CreatePlaylist>) {
    try {
      const data = SongDB.createPlaylist(request.params.name, request.params.desc, request.params.imgSrc)
      event.reply(request.responseChannel, data)
    } catch (e) {
      console.error(e)
      event.reply(request.responseChannel)
    }
  }

  private addToPlaylist(event: Electron.IpcMainEvent, request: IpcRequest<PlaylistRequests.AddToPlaylist>) {
    const data = SongDB.addToPlaylist(request.params.playlist_id, ...request.params.song_ids)
    event.reply(request.responseChannel, data)
  }

  private async saveCoverToFile(event: Electron.IpcMainEvent, request: IpcRequest<PlaylistRequests.SaveCover>) {
    if (request.params.b64) {
      const cacheDir = loadPreferences().thumbnailPath
      const filePath = path.join(cacheDir, v4() + '.png')
      if (fs.existsSync(cacheDir)) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } else {
        fs.mkdirSync(cacheDir)
      }
      fs.writeFile(filePath, request.params.b64.replace(/^data:image\/png;base64,/, ''), 'base64', () => {
        event.reply(request.responseChannel, filePath)
      })
      return
    }
    event.reply(request.responseChannel)
  }

  private async removePlaylist(
    event: Electron.IpcMainEvent,
    request: IpcRequest<PlaylistRequests.RemoveExportPlaylist>
  ) {
    if (request.params.playlist_id) {
      await SongDB.removePlaylist(request.params.playlist_id).then(() => event.reply(request.responseChannel))
    }
    event.reply(request.responseChannel)
  }

  private async exportPlaylist(
    event: Electron.IpcMainEvent,
    request: IpcRequest<PlaylistRequests.RemoveExportPlaylist>
  ) {
    if (request.params.playlist_id) {
      const playlist = SongDB.getEntityByOptions<Playlist>({ playlist: { playlist_id: request.params.playlist_id } })[0]
      if (playlist) {
        const m3u8 = `#EXTM3U\n#PLAYLIST:${playlist.playlist_name}\n${this.parsePlaylistSongs(playlist)}`

        const filePath = await _windowHandler.openSaveDialog(true, {
          title: 'Save playlist as...',
          properties: ['showOverwriteConfirmation', 'createDirectory'],
          filters: [
            {
              name: 'm3u Playlist',
              extensions: ['m3u']
            }
          ]
        })
        if (!filePath?.canceled && filePath?.filePath) {
          let exportPath = filePath.filePath
          if (!path.extname(exportPath).startsWith('.m3u')) {
            exportPath += '.m3u'
          }

          console.debug('Exporting playlist to', exportPath)
          writeFile(exportPath, m3u8, {
            encoding: 'utf-8'
          })
        }
      }
    }
    event.reply(request.responseChannel)
  }

  private parsePlaylistSongs(playlist: Playlist) {
    let ret = ''
    const playlistSongs = SongDB.getSongByOptions({ playlist: { playlist_id: playlist.playlist_id } })
    for (const s of playlistSongs) {
      ret += `#EXTINF:${Math.round(s.duration) ?? 0},${this.getSongTitleParsed(s)}\n${s.path}\n`
    }
    return ret
  }

  private getSongTitleParsed(song: Song) {
    if (song.artists && song.artists.length > 0) {
      return `${song.artists[0]} - ${song.title}`
    }

    return song.title
  }
}
