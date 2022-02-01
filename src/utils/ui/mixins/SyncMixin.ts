/* 
 *  SyncMixin.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { Component } from 'vue-property-decorator';
import ImgLoader from '@/utils/ui/mixins/ImageLoader';
import ModelHelper from '@/utils/ui/mixins/ModelHelper';
import { PeerMode } from '@/mainWindow/store/syncState';
import { SyncHolder } from '../sync/syncHandler';
import { bus } from '@/mainWindow/main';
import { mixins } from 'vue-class-component';
import { vxm } from '@/mainWindow/store';

@Component
export default class SyncMixin extends mixins(ModelHelper, ImgLoader) {
  private isFetching: boolean = false
  private peerHolder: SyncHolder = new SyncHolder()
  private isRemoteStateChange: boolean = false
  private isRemoteTrackChange: boolean = false
  public setSongSrcCallback!: (src: string) => void
  public onSeekCallback!: (time: number) => void

  private _resolve!: () => void
  private _reject!: (r: any) => void
  private initialized = new Promise<void>(this.attachPromise.bind(this))

  private attachPromise(resolve: () => void, reject: (r: any) => void) {
    this._resolve = resolve
    this._reject = reject
  }

  created() {
    this.peerHolder.initialize().then(() => {
      this.peerHolder.start()
      this._resolve()
    }).catch(err => {
      this._reject(err)
    })
  }

  mounted() {
    this.initialized.then(this.syncListeners).catch(err => console.error(err))
  }

  get isWatching() {
    return vxm.sync.mode == PeerMode.WATCHER
  }

  get isSyncing() {
    return vxm.sync.mode != PeerMode.UNDEFINED
  }

  private isYoutube(song: RemoteSong): boolean {
    return song.type === "YOUTUBE"
  }

  private async setLocalCover(event: RemoteSong, from: string) {
    let cover: string | undefined

    if (event.senderSocket === this.peerHolder.socketID) {
      cover = (await window.SearchUtils.searchSongsByOptions({
        song: {
          _id: event._id
        }
      }))[0].song_coverPath_high

    } else {
      cover = await window.FileUtils.isImageExists(event._id!)
    }

    if (cover) vxm.sync.setCover('media://' + cover)
    else {
      vxm.sync.setCover('')
      this.peerHolder.requestCover(from, event._id!)
    }
  }

  private async checkLocalAudio(event: RemoteSong) {
    const isAudioExists = await window.FileUtils.isAudioExists(event._id!)
    if (isAudioExists) {
      if (vxm.sync.isReadyRequested) this.peerHolder.emitReady()
      this.setSongSrcCallback('media://' + isAudioExists)
    } else vxm.sync.prioritize(vxm.sync.prefetch.findIndex((x) => x && x._id === event._id))
  }

  private async checkYoutubeAudio() {
    if (vxm.sync.isReadyRequested) this.peerHolder.emitReady()
  }

  private async setYoutubeCover(event: RemoteSong) {
    if (event.song_coverPath_low?.startsWith('http') || event.song_coverPath_high?.startsWith('http'))
      vxm.sync.setCover(event.song_coverPath_high ?? event.song_coverPath_low ?? '')
    else
      vxm.sync.setCover('')

  }

  private async setRemoteTrackInfo(event: RemoteSong | undefined, from: string, songIndex: number) {
    if (event) {
      vxm.sync.setQueueIndex(songIndex)
      if (this.isSyncing && this.peerHolder.socketID !== from && event?._id) {
        this.isRemoteTrackChange = true
        vxm.sync.setSong(event)
        vxm.player.playerState = 'PAUSED'
      }

      if (this.isYoutube(event)) {
        await this.setYoutubeCover(event)
        await this.checkYoutubeAudio()
      } else {
        await this.setLocalCover(event, from)
        await this.checkLocalAudio(event)
      }
    }
  }

  private setRemoteCover(event: Blob) {
    if (this.isSyncing && vxm.sync.currentSongDets) {
      const reader = new FileReader()
      const songID = vxm.sync.currentSongDets._id!
      reader.onload = async () => {
        if (reader.readyState == 2) {
          const buffer = Buffer.from(reader.result as ArrayBuffer)
          const filePath = await window.FileUtils.saveImageToFile(songID, buffer)
          vxm.sync.setCover('media://' + filePath)
        }
      }
      reader.readAsArrayBuffer(event)
    }
  }

  private async getLocalCover(songID: string) {
    const song = vxm.sync.localQueue.find((song) => song._id == songID)
    if (song) {
      const cover = this.getValidImageLow(song)
      if (cover) {
        const resp = await fetch(this.getImgSrc(cover))
        const buf = await resp.arrayBuffer()
        return buf
      }
    }
    return null
  }

  private saveRemoteStream(event: Blob) {
    const reader = new FileReader()
    reader.onload = async () => {
      if (reader.readyState == 2) {
        const buffer = Buffer.from(reader.result as ArrayBuffer)
        const filePath = await window.FileUtils.saveAudioToFile(vxm.sync.currentFetchSong, buffer)
        if (vxm.sync.currentSongDets!._id == vxm.sync.currentFetchSong) {
          if (vxm.sync.isReadyRequested) this.peerHolder.emitReady()
          if (this.setSongSrcCallback) this.setSongSrcCallback('media://' + filePath)
        }
        this.fetchRemoteSong()
      }
    }
    reader.readAsArrayBuffer(event)
  }

  private async getLocalSong(songID: string) {
    const song = vxm.sync.localQueue.find((song) => song._id === songID)
    if (song) {
      const resp = await fetch('media://' + song.path!)
      const buf = await resp.arrayBuffer()
      return buf
    }
    return null
  }

  private async handleRemotePlayerState(state: PlayerState) {
    this.isRemoteStateChange = true
    vxm.player.playerState = state
  }

  private onRemoteSeek(time: number) {
    this.onSeekCallback(time)
  }

  private addToPrefetchQueue(...song: RemoteSong[]) {
    if (this.isSyncing) {
      for (const s of song) this.peerHolder.addToQueue(s)
    }
  }

  private beginFetching() {
    if (!this.isFetching) this.fetchRemoteSong()
  }

  private async handleReadyRequest(isReadyRequested: boolean) {
    if (isReadyRequested && vxm.sync.currentSongDets) {
      if (vxm.sync.currentSongDets.type === "LOCAL") {
        const isAudioExists = await window.FileUtils.isAudioExists(vxm.sync.currentSongDets._id!)
        if (!this.isFetching) {
          /*
           * If the room is already streaming and another user joins in, everyone's state will be set to LOADING.
           * The users who already were playing the song might not be fetching and should only check if the audio exists
           */
          if (isAudioExists) this.peerHolder.emitReady()
        } else {
          /*
           * If the user is fetching a song, check if it matches the current playing.
           * If it does, then let it fetch and emitReady will be handled by saveRemoteStream
           * Otherwise check if audio exists and emitReady if it does
           */
          if (vxm.sync.currentFetchSong != vxm.sync.currentSongDets._id) {
            if (isAudioExists) this.peerHolder.emitReady()
          }
        }
      } else {
        this.peerHolder.emitReady()
      }
    }
  }

  private addRecentSongToPrefetch(songs: RemoteSong[]) {
    this.addToPrefetchQueue(songs[songs.length - 1])
  }

  private syncListeners() {
    this.peerHolder.onRemoteTrackInfo = this.setRemoteTrackInfo
    this.peerHolder.onRemoteCover = this.setRemoteCover
    this.peerHolder.fetchCover = this.getLocalCover
    this.peerHolder.onRemoteStream = this.saveRemoteStream
    this.peerHolder.onPrefetchAdded = vxm.sync.addToPrefetch
    this.peerHolder.onPrefetchSet = vxm.sync.setPrefetch
    this.peerHolder.onQueueAdd = vxm.sync.addQueueItem
    this.peerHolder.onQueueSet = vxm.sync.setQueueItem
    this.peerHolder.getRequestedSong = this.playRequested
    this.peerHolder.fetchSong = this.getLocalSong
    this.peerHolder.fetchCurrentSong = () => vxm.player.currentSong
    this.peerHolder.playerStateHandler = this.handleRemotePlayerState
    // TODO: Handle this event somewhere
    this.peerHolder.peerConnectionStateHandler = (id, state) => bus.$emit('onPeerConnectionStateChange', id, state)
    this.peerHolder.onSeek = this.onRemoteSeek
    this.peerHolder.onReadyRequested = vxm.sync.setReadyRequested
    // this.peerHolder.onAllReady = () => SyncModule.setWaiting(false)

    vxm.sync.$watch('prefetch', this.beginFetching)
    vxm.sync.$watch('isReadyRequested', this.handleReadyRequest)
    vxm.sync.$watch('localQueue', this.addRecentSongToPrefetch)
    vxm.sync.$watch('queueIndex', this.requestPlay)
  }

  private playRequested(songIndex: number) {
    const song = vxm.sync.localQueue.find((item) => item._id === vxm.sync.queueOrder[songIndex])
    console.log(song)
    if (song) {
      vxm.sync.setSong(song)
    }
  }

  private async fetchRemoteSong() {
    this.isFetching = true
    for (const prefetch of vxm.sync.prefetch) {
      if (prefetch && prefetch.type === "LOCAL") {
        const isExists = await window.FileUtils.isAudioExists(prefetch._id!)
        if (!isExists) {
          vxm.sync.setCurrentFetchSong(prefetch._id)
          this.peerHolder.requestSong(prefetch.sender, prefetch._id!)
          return
        }
      }
    }
    this.isFetching = false
  }

  protected handleBroadcasterAudioLoad(song: Song): boolean {
    if (this.isSyncing) {
      if (this.isRemoteTrackChange) {
        this.isRemoteTrackChange = false
        return true
      }

      vxm.player.playerState = 'PAUSED'
      vxm.sync.setCover('')
      this.peerHolder.PlaySong(song)

      return true
    }
    return false
  }

  private initializeRTC(mode: PeerMode) {
    this.peerHolder.peerMode = mode
    vxm.sync.setMode(mode)

    this.peerHolder.onJoinedRoom = (id: string) => {
      vxm.sync.setRoom(id)
    }
  }

  protected joinRoom(id: string) {
    console.log('joining room', id)
    this.initializeRTC(PeerMode.WATCHER)
    this.peerHolder.joinRoom(id)
  }

  protected createRoom() {
    this.initializeRTC(PeerMode.BROADCASTER)
    this.peerHolder.createRoom()
  }

  protected remoteSeek(time: number) {
    this.peerHolder.emitSeek(time)
  }

  protected emitPlayerState(newState: PlayerState) {
    if (this.isSyncing && !this.isRemoteStateChange) {
      this.peerHolder.emitPlayerState(newState)
    }
    this.isRemoteStateChange = false
  }

  protected playNow(song: RemoteSong) {
    this.peerHolder.addToQueueAndPlay(song)
  }

  private requestPlay(song_index: number) {
    this.peerHolder.requestPlay(song_index)
  }
}
