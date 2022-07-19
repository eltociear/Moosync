/*
 *  PlayerControls.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { Component, Vue } from 'vue-property-decorator'

import { PeerMode } from '@/mainWindow/store/syncState'
import { vxm } from '@/mainWindow/store'

@Component
export default class PlayerControls extends Vue {
  get playerState() {
    return vxm.player.playerState
  }

  get isSyncing() {
    return vxm.sync.mode !== PeerMode.UNDEFINED
  }

  public nextSong() {
    if (this.isSyncing) vxm.sync.nextSong()
    else vxm.player.nextSong()
  }

  public prevSong() {
    if (this.isSyncing) vxm.sync.prevSong()
    else vxm.player.prevSong()
  }

  public async queueSong(songs: Song[]) {
    if (this.isSyncing) {
      await vxm.sync.pushInQueue({ item: songs, top: false })
    } else {
      await vxm.player.pushInQueue({ item: songs, top: false })
    }

    this.$toasted.show(`Queued ${songs.length} song${songs.length !== 1 ? 's' : ''}`)
  }

  public async playTop(songs: Song[]) {
    if (this.isSyncing) {
      await vxm.sync.pushInQueue({ item: songs.slice(), top: true })
    } else {
      await vxm.player.pushInQueue({ item: songs.slice(), top: true })
    }

    if (!this.isSyncing) vxm.player.playAfterLoad = true

    this.$toasted.show(`Queued ${songs.length} song${songs.length !== 1 ? 's' : ''}`)
  }

  public play() {
    vxm.player.playerState = 'PLAYING'
  }

  public pause() {
    vxm.player.playerState = 'PAUSED'
  }

  public shuffle() {
    vxm.player.shuffle()
    this.$toasted.show('Shuffled', {
      duration: 1000
    })
  }

  public togglePlayerState() {
    if (this.playerState == 'PAUSED' || this.playerState == 'STOPPED') {
      vxm.player.playerState = 'PLAYING'
    } else {
      vxm.player.playerState = 'PAUSED'
    }
  }

  public stop() {
    vxm.player.playerState = 'STOPPED'
  }

  public playFromQueue(index: number) {
    if (this.isSyncing) {
      vxm.sync.playQueueSong(index)
    } else {
      vxm.player.playQueueSong(index)
    }
  }

  public removeFromQueue(index: number) {
    vxm.player.pop(index)
  }

  public setSongIndex(oldIndex: number, newIndex: number) {
    vxm.player.setSongIndex({ oldIndex, newIndex, ignoreMove: false })
  }

  get repeat() {
    return vxm.player.Repeat
  }

  public toggleRepeat() {
    vxm.player.Repeat = !this.repeat
  }
}
