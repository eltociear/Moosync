/*
 *  player.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

export abstract class Player {
  abstract load(src?: string, volume?: number, autoplay?: boolean): void
  abstract play(): Promise<void>
  abstract pause(): void
  abstract stop(): void

  abstract get currentTime(): number
  abstract set currentTime(time: number)

  abstract get volume(): number
  abstract set volume(volume: number)

  set onEnded(callback: () => void) {
    this.listenOnEnded(callback)
  }

  set onTimeUpdate(callback: (time: number) => void) {
    this.listenOnTimeUpdate(callback)
  }

  set onLoad(callback: () => void) {
    this.listenOnLoad(callback)
  }

  set onError(callback: (err: ErrorEvent) => void) {
    this.listenOnError(callback)
  }

  set onStateChange(callback: (state: PlayerState) => void) {
    this.listenOnStateChange(callback)
  }

  set onBuffer(callback: () => void) {
    this.listenOnBuffer(callback)
  }

  protected abstract listenOnEnded(callback: () => void): void
  protected abstract listenOnTimeUpdate(callback: (time: number) => void): void
  protected abstract listenOnLoad(callback: () => void): void
  protected abstract listenOnError(callback: OnErrorEventHandler | ((err: ErrorEvent) => void)): void
  protected abstract listenOnStateChange(callback: (state: PlayerState) => void): void
  protected abstract listenOnBuffer(callback: () => void): void
  abstract removeAllListeners(): void
}
