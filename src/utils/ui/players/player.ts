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
    console.debug('Set onEnded callback')
  }

  set onTimeUpdate(callback: (time: number) => void) {
    this.listenOnTimeUpdate(callback)
    console.debug('Set onTimeUpdate callback')
  }

  set onLoad(callback: () => void) {
    this.listenOnLoad(callback)
    console.debug('Set onLoad callback')
  }

  set onError(callback: (err: Error) => void) {
    this.listenOnError(callback)
    console.debug('Set onError callback')
  }

  set onStateChange(callback: (state: PlayerState) => void) {
    this.listenOnStateChange(callback)
    console.debug('Set onStateChange callback')
  }

  set onBuffer(callback: () => void) {
    this.listenOnBuffer(callback)
    console.debug('Set onBuffer callback')
  }

  protected abstract listenOnEnded(callback: () => void): void
  protected abstract listenOnTimeUpdate(callback: (time: number) => void): void
  protected abstract listenOnLoad(callback: () => void): void
  protected abstract listenOnError(callback: (err: Error) => void): void
  protected abstract listenOnStateChange(callback: (state: PlayerState) => void): void
  protected abstract listenOnBuffer(callback: () => void): void
  abstract removeAllListeners(): void

  abstract createAudioContext(): AudioContext | undefined
  abstract connectAudioContextNode(node: AudioNode): void
}
