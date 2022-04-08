/*
 *  local.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { Player } from './player'

export class LocalPlayer extends Player {
  playerInstance: HTMLAudioElement

  constructor(playerInstance: HTMLAudioElement) {
    super()
    this.playerInstance = playerInstance
    this.playerInstance.load()
  }

  load(src?: string, volume?: number, autoplay?: boolean): void {
    src && (this.playerInstance.src = src)
    this.playerInstance.load()
    volume && (this.volume = volume)
    autoplay && this.play()
  }

  async play(): Promise<void> {
    if (this.playerInstance.paused) await this.playerInstance.play()
  }

  pause(): void {
    if (!this.playerInstance.paused) this.playerInstance.pause()
  }

  stop(): void {
    this.playerInstance.removeAttribute('src')
    this.playerInstance.srcObject = null
    this.playerInstance.load()
  }

  get currentTime(): number {
    return this.playerInstance.currentTime
  }

  set currentTime(time: number) {
    this.playerInstance.currentTime = time
  }

  get volume(): number {
    return this.playerInstance.volume * 100
  }

  set volume(volume: number) {
    this.playerInstance.volume = volume / 100
  }

  protected listenOnEnded(callback: () => void): void {
    this.playerInstance.addEventListener('ended', callback)
  }

  protected listenOnTimeUpdate(callback: (time: number) => void): void {
    this.playerInstance.ontimeupdate = (e) => callback((e.currentTarget as HTMLAudioElement).currentTime)
  }

  protected listenOnLoad(callback: () => void): void {
    this.playerInstance.onload = callback
    this.playerInstance.onloadeddata = callback
  }

  protected listenOnError(callback: OnErrorEventHandler | ((err: ErrorEvent) => void)): void {
    this.playerInstance.onerror = callback as OnErrorEventHandler
  }

  private listeners: { [key: string]: () => void } = {}

  protected listenOnStateChange(callback: (state: PlayerState) => void): void {
    const play = () => callback('PLAYING')
    const pause = () => callback('PAUSED')
    const stop = () => callback('STOPPED')

    this.playerInstance.addEventListener('play', play)
    this.playerInstance.addEventListener('pause', pause)
    this.playerInstance.addEventListener('ended', stop)

    this.listeners['play'] = play
    this.listeners['pause'] = pause
    this.listeners['ended'] = stop
  }

  protected listenOnBuffer(callback: () => void): void {
    this.playerInstance.onloadstart = () => callback
  }

  removeAllListeners(): void {
    this.playerInstance.onended = null
    this.playerInstance.ontimeupdate = null
    for (const [key, value] of Object.entries(this.listeners)) {
      this.playerInstance.removeEventListener(key as keyof HTMLMediaElementEventMap, value)
    }
  }
}
