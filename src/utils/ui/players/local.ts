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

  load(src?: string, volume?: number): void {
    src && (this.playerInstance.src = src)
    volume && (this.volume = volume);
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

  removeAllListeners(): void {
    this.playerInstance.onended = null
    this.playerInstance.ontimeupdate = null
    for (const [key, value] of Object.entries(this.listeners)) {
      this.playerInstance.removeEventListener(key as keyof HTMLMediaElementEventMap, value as any)
    }
  }
}
