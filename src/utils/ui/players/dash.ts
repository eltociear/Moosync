/*
 *  dash.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { Player } from './player'
import dashjs from 'dashjs'

export class DashPlayer extends Player {
  private playerInstance: dashjs.MediaPlayerClass

  constructor(element: HTMLVideoElement) {
    super()
    this.playerInstance = dashjs.MediaPlayer().create()
    this.playerInstance.initialize(element)
  }

  load(src?: string, volume?: number, autoplay?: boolean): void {
    if (src) {
      this.playerInstance.attachSource(src)
      volume && this.playerInstance.setVolume(volume)
      autoplay && this.playerInstance.setAutoPlay(autoplay)
    } else {
      this.playerInstance.reset()
    }
  }

  async play(): Promise<void> {
    this.playerInstance.play()
  }

  pause(): void {
    this.playerInstance.pause()
  }

  stop(): void {
    this.playerInstance.reset()
  }

  get currentTime(): number {
    return this.playerInstance.time()
  }

  set currentTime(time: number) {
    this.playerInstance.seek(time)
  }

  get volume(): number {
    return this.playerInstance.getVolume()
  }

  set volume(volume: number) {
    this.playerInstance.setVolume(volume / 100)
  }

  protected listenOnEnded(callback: () => void): void {
    this.playerInstance.on('ended', callback)
  }

  protected listenOnTimeUpdate(callback: (time: number) => void): void {
    this.playerInstance.on('playbackTimeUpdated', (e) => callback(e.time ?? 0))
  }

  protected listenOnLoad(callback: () => void): void {
    this.playerInstance.on('bufferLoaded', callback)
    this.playerInstance.on('manifestLoaded', callback)
  }

  protected listenOnError(callback: (err: Error) => void): void {
    this.playerInstance.on('error', (e) => callback(new Error(e.error.toString())))
    this.playerInstance.on('playbackError', (e) => callback(new Error(e.error.toString())))
  }

  private listeners: { [key: string]: () => void } = {}

  protected listenOnStateChange(callback: (state: PlayerState) => void): void {
    const play = () => callback('PLAYING')
    const pause = () => callback('PAUSED')
    const stop = () => callback('STOPPED')

    this.playerInstance.on('playbackStarted', play)
    this.playerInstance.on('playbackPaused', pause)
    this.playerInstance.on('ended', stop)

    this.listeners['playbackStarted'] = play
    this.listeners['playbackPaused'] = pause
    this.listeners['ended'] = stop
  }

  protected listenOnBuffer(callback: () => void): void {
    this.playerInstance.on('bufferStalled', callback)
  }

  removeAllListeners(): void {
    // TODO
  }
}
