/* 
 *  local.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
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

  load(src?: string): void {
    if (src) this.playerInstance.src = src
  }

  async play(): Promise<void> {
    return this.playerInstance.play()
  }

  pause(): void {
    return this.playerInstance.pause()
  }

  stop(): void {
    this.playerInstance.srcObject = null
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
    this.playerInstance.oncanplay = this.onLoadCallback!
  }

  protected listenOnError(): void {
    this.playerInstance.onerror = this.onErrorCallback as OnErrorEventHandler
  }

  protected listenOnStateChange(): void {
    if (this.onStateChangeCallback) {
      this.playerInstance.addEventListener('play', () => this.onStateChangeCallback!('PLAYING'))
      this.playerInstance.addEventListener('pause', () => this.onStateChangeCallback!('PAUSED'))
      this.playerInstance.addEventListener('ended', () => this.onStateChangeCallback!('STOPPED'))
    }
  }

  removeAllListeners(): void {
    this.playerInstance.onended = null
    this.playerInstance.ontimeupdate = null
  }
}
