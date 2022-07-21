/*
 *  mpris.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { IpcEvents, MprisEvents } from './constants'
import { ButtonEnum, MediaController, PlaybackStateEnum } from 'media-controller'
import { WindowHandler } from '../windowManager'

export class MprisChannel implements IpcChannelInterface {
  name = IpcEvents.MPRIS
  private controller = new MediaController()

  constructor() {
    this.controller.createPlayer()
    this.onButtonPressed()
  }

  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case MprisEvents.PLAYBACK_STATE_CHANGED:
        this.onPlaybackStateChanged(event, request as IpcRequest<MprisRequests.PlaybackState>)
        break
      case MprisEvents.SONG_INFO_CHANGED:
        this.onSongInfoChange(event, request as IpcRequest<MprisRequests.SongInfo>)
        break
      case MprisEvents.BUTTON_STATUS_CHANGED:
        this.setButtonStatus(event, request as IpcRequest<MprisRequests.ButtonStatus>)
        break
      case MprisEvents.SHUFFLE_REPEAT_CHANGED:
        this.setShuffleRepeat(event, request as IpcRequest<MprisRequests.ShuffleRepeat>)
        break
    }
  }

  private onSongInfoChange(event: Electron.IpcMainEvent, request: IpcRequest<MprisRequests.SongInfo>) {
    if (request.params) {
      const { title, albumName, artistName, albumArtist, thumbnail, genres } = request.params
      if (!title) {
        this.controller.updatePlayerDetails({
          title: '',
          albumName: '',
          artistName: '',
          thumbnail: '',
          genres: [],
          albumArtist: ''
        })
      } else {
        this.controller.updatePlayerDetails({ title, albumName, artistName, thumbnail, genres, albumArtist })
      }
    }

    event.reply(request.responseChannel)
  }

  private onPlaybackStateChanged(event: Electron.IpcMainEvent, request: IpcRequest<MprisRequests.PlaybackState>) {
    if (request.params.state) {
      switch (request.params.state) {
        case 'PLAYING':
          this.controller.setPlaybackStatus(PlaybackStateEnum.Playing)
          break
        case 'PAUSED':
          this.controller.setPlaybackStatus(PlaybackStateEnum.Paused)
          break
        case 'STOPPED':
          this.controller.setPlaybackStatus(PlaybackStateEnum.Stopped)
          break
        case 'LOADING':
          this.controller.setPlaybackStatus(PlaybackStateEnum.Changing)
          break
      }
    }
    event.reply(request.responseChannel)
  }

  private setButtonStatus(event: Electron.IpcMainEvent, request: IpcRequest<MprisRequests.ButtonStatus>) {
    if (request.params) {
      const { play, pause, next, prev } = request.params
      console.log(request.params)
      this.controller.setButtonStatus({
        play,
        pause,
        next,
        prev
      })
    }

    event.reply(request.responseChannel)
  }

  private setShuffleRepeat(event: Electron.IpcMainEvent, request: IpcRequest<MprisRequests.ShuffleRepeat>) {
    if (request.params) {
      this.controller.setShuffleRepeat(request.params.shuffle, request.params.repeat)
    }

    event.reply(request.responseChannel)
  }

  private onButtonPressed() {
    this.controller.setButtonPressCallback((args) => {
      WindowHandler.getWindow(true)?.webContents.send(MprisEvents.ON_BUTTON_PRESSED, args as typeof ButtonEnum)
    })
  }
}
