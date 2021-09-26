/* 
 *  player.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

export abstract class Player {
  protected onEndedCallback: (() => void) | undefined
  protected onLoadCallback: (() => void) | undefined
  protected onTimeUpdateCallback: ((time: number) => void) | undefined
  protected onErrorCallback: OnErrorEventHandler | ((err: ErrorEvent) => void) | undefined
  protected onStateChangeCallback: ((state: PlayerState) => void) | undefined


  abstract load(src?: string, volume?: number, autoplay?: boolean): void
  abstract play(): Promise<void>
  abstract pause(): void
  abstract stop(): void

  abstract get currentTime(): number
  abstract set currentTime(time: number)

  abstract get volume(): number
  abstract set volume(volume: number)

  set onEnded(callback: () => void) {
    this.onEndedCallback = callback
    this.listenOnEnded()
  }

  set onTimeUpdate(callback: (time: number) => void) {
    this.onTimeUpdateCallback = callback
    this.listenOnTimeUpdate()
  }

  set onLoad(callback: () => void) {
    this.onLoadCallback = callback
    this.listenOnLoad()
  }

  set onError(callback: (err: ErrorEvent) => void) {
    this.onErrorCallback = callback
    this.listenOnError()
  }

  set onStateChange(callback: (state: PlayerState) => void) {
    this.onStateChangeCallback = callback
    this.listenOnStateChange()
  }

  protected abstract listenOnEnded(): void
  protected abstract listenOnTimeUpdate(): void
  protected abstract listenOnLoad(): void
  protected abstract listenOnError(): void
  protected abstract listenOnStateChange(): void
  abstract removeAllListeners(): void
}
