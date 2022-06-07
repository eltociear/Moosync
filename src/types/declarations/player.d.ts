/*
 *  player.d.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

type AudioType = 'STREAMING' | 'LOCAL'

type PlayerState = 'PLAYING' | 'PAUSED' | 'STOPPED'
interface SongQueue {
  data: { [id: string]: Song }
  order: { id: string; songID: string }[]
  index: number
}

type playlistInfo = { [key: string]: string }

type QueueOrder = { id: string; songID: string }[]
type QueueData<T> = { [id: string]: T }

interface GenericQueue<T> {
  data: QueueData<T>
  order: QueueOrder
  index: number
}

class CustomAudioInstance {
  currentTime: number
  volume: number
  src: string
  paused: boolean
  srcObject: unknown

  public load(): void
  public pause(): void
  public play(): Promise<void>

  onended: ((this: GlobalEventHandlers, ev: Event) => any) | null
  ontimeupdate: ((this: GlobalEventHandlers, ev: Event) => any) | null
  onload: ((this: GlobalEventHandlers, ev: Event) => any) | null
  onloadeddata: ((this: GlobalEventHandlers, ev: Event) => any) | null
  onerror: OnErrorEventHandler
  onloadstart: ((this: GlobalEventHandlers, ev: Event) => any) | null

  removeAttribute(str: string): void
  addEventListener(ev: string, callback: unknown)
  removeEventListener(ev: string, callback: unknown)
}
