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
    volume && (this.volume = volume);
    autoplay && this.play()
  }

  async play(): Promise<void> {
    if (this.playerInstance.paused)
      await this.playerInstance.play()
  }

  pause(): void {
    if (!this.playerInstance.paused)
      this.playerInstance.pause()
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

  protected listenOnEnded(): void {
    this.playerInstance.addEventListener('ended', this.onEndedCallback!)
  }

  protected listenOnTimeUpdate(): void {
    this.playerInstance.ontimeupdate = (e) =>
      this.onTimeUpdateCallback!((e.currentTarget as HTMLAudioElement).currentTime)
  }

  protected listenOnLoad(): void {
    this.playerInstance.onload = this.onLoadCallback!
  }

  protected listenOnError(): void {
    this.playerInstance.onerror = this.onErrorCallback as OnErrorEventHandler
  }

  private listeners: { [key: string]: Function } = {}

  protected listenOnStateChange(): void {
    if (this.onStateChangeCallback) {
      const play = () => this.onStateChangeCallback!('PLAYING')
      const pause = () => this.onStateChangeCallback!('PAUSED')
      const stop = () => this.onStateChangeCallback!('STOPPED')

      this.playerInstance.addEventListener('play', play)
      this.playerInstance.addEventListener('pause', pause)
      this.playerInstance.addEventListener('ended', stop)

      this.listeners['play'] = play
      this.listeners['pause'] = pause
      this.listeners['ended'] = stop
    }
  }

  protected listenOnBuffer(): void {
    // Local player has no need of buffering event (i think)
  }

  removeAllListeners(): void {
    this.playerInstance.onended = null
    this.playerInstance.ontimeupdate = null
    for (const [key, value] of Object.entries(this.listeners)) {
      this.playerInstance.removeEventListener(key as keyof HTMLMediaElementEventMap, value as any)
    }
  }
}
