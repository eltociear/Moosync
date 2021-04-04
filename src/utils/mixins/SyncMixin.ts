import { bus } from '@/mainWindow/main'
import { PlayerModule, PlayerState } from '@/mainWindow/store/playerState'
import { PeerMode, SyncModule } from '@/mainWindow/store/syncState'
import { Song } from '@/models/songs'
import { Component } from 'vue-property-decorator'
import { SyncHolder } from '../sync/syncHandler'
import { mixins } from 'vue-class-component'
import ModelHelper from '@/utils/mixins/ModelHelper'

@Component
export default class SyncMixin extends mixins(ModelHelper) {
  private isFetching: boolean = false
  private peerHolder = new SyncHolder('http://retardnetwork.cf:4000')
  private isRemoteStateChange: boolean = false
  public setSongSrcCallback!: (src: string) => void
  public onSeekCallback!: (time: number) => void

  created() {
    this.peerHolder.start()
  }

  mounted() {
    this.syncListeners()
  }

  get isWatching() {
    return SyncModule.mode == PeerMode.WATCHER
  }

  get isSyncing() {
    return SyncModule.mode != PeerMode.UNDEFINED
  }

  private async setRemoteTrackInfo(event: Song, from: string) {
    if (this.peerHolder.peerMode == PeerMode.WATCHER && event._id) {
      SyncModule.setSong(event)
      PlayerModule.setState(PlayerState.LOADING)
      const isAudioExists = await window.FileUtils.isFileExists('audio', event._id!)
      const isCoverExists = await window.FileUtils.isFileExists('image', event._id!)
      if (isCoverExists) SyncModule.setCover(isCoverExists)
      else this.peerHolder.requestCover(from, event._id!)

      if (isAudioExists) {
        if (SyncModule.isReadyRequested) this.peerHolder.emitReady()
        this.setSongSrcCallback('media://' + isAudioExists)
      } else SyncModule.prioritize(SyncModule.prefetch.findIndex((x) => x._id === event._id))
    }
  }

  private setRemoteCover(event: Blob) {
    if (this.peerHolder.peerMode == PeerMode.WATCHER && SyncModule.currentSongDets) {
      let reader = new FileReader()
      let songID = SyncModule.currentSongDets._id!
      reader.onload = async () => {
        if (reader.readyState == 2) {
          const buffer = Buffer.from(reader.result as ArrayBuffer)
          const filePath = await window.FileUtils.saveImageToFile(songID, buffer)
          SyncModule.setCover(filePath)
        }
      }
      reader.readAsArrayBuffer(event)
    }
  }

  private async getLocalCover(songID: string) {
    const song = PlayerModule.queue.data[songID]
    if (song && this.isAlbumExists(song)) {
      const resp = await fetch('media://' + song!.album!.album_coverPath)
      let buf = await resp.arrayBuffer()
      return buf
    }
  }

  private saveRemoteStream(event: Blob) {
    let reader = new FileReader()
    reader.onload = async () => {
      if (reader.readyState == 2) {
        const buffer = Buffer.from(reader.result as ArrayBuffer)
        const filePath = await window.FileUtils.saveAudioTOFile(SyncModule.currentFetchSong, buffer)
        if (SyncModule.currentSongDets!._id == SyncModule.currentFetchSong) {
          this.peerHolder.emitReady()
          if (this.setSongSrcCallback) this.setSongSrcCallback('media://' + filePath)
        }
        this.fetchRemoteSong()
      }
    }
    reader.readAsArrayBuffer(event)
  }

  private async getLocalSong(songID: string) {
    if (PlayerModule.queue.data[songID].path) {
      const resp = await fetch('media://' + PlayerModule.queue.data[songID].path!)
      let buf = await resp.arrayBuffer()
      return buf
    }
    return null
  }

  private async handleRemotePlayerState(state: PlayerState) {
    this.isRemoteStateChange = true
    PlayerModule.setState(state)
  }

  private onRemoteSeek(time: number) {
    this.onSeekCallback(time)
  }

  private addToPrefetchQueue(song: Song) {
    if (this.peerHolder.peerMode == PeerMode.BROADCASTER) this.peerHolder.addToQueue(song)
  }

  private beginFetching() {
    if (!this.isFetching) this.fetchRemoteSong()
  }

  private async handleReadyRequest(isReadyRequested: boolean) {
    if (isReadyRequested) {
      if (!this.isFetching) this.peerHolder.emitReady
      else {
        if (SyncModule.currentFetchSong != SyncModule.currentSongDets!._id) {
          const isAudioExists = await window.FileUtils.isFileExists('audio', SyncModule.currentSongDets!._id!)
          if (isAudioExists) this.peerHolder.emitReady()
        }
      }
    }
  }

  private syncListeners() {
    this.peerHolder.onRemoteTrackInfo = this.setRemoteTrackInfo
    this.peerHolder.onRemoteCover = this.setRemoteCover
    this.peerHolder.fetchCover = this.getLocalCover
    this.peerHolder.onRemoteStream = this.saveRemoteStream
    this.peerHolder.onPrefetchAdded = SyncModule.addToPrefetch
    this.peerHolder.onPrefetchSet = SyncModule.setPrefetch
    this.peerHolder.fetchSong = this.getLocalSong
    this.peerHolder.fetchCurrentSong = () => PlayerModule.currentSong
    this.peerHolder.playerStateHandler = this.handleRemotePlayerState
    // TODO: Handle this event somewhere
    this.peerHolder.peerConnectionStateHandler = (id, state) => bus.$emit('onPeerConnectionStateChange', id, state)
    this.peerHolder.onSeek = this.onRemoteSeek
    this.peerHolder.onReadyRequested = SyncModule.setReadyRequested
    // this.peerHolder.onAllReady = () => SyncModule.setWaiting(false)

    SyncModule.$watch((syncModule) => syncModule.prefetch, this.beginFetching)
    SyncModule.$watch((syncModule) => syncModule.isReadyRequested, this.handleReadyRequest)

    bus.$on('queuedSong', this.addToPrefetchQueue)
  }

  private async fetchRemoteSong() {
    this.isFetching = true
    for (const prefetch of SyncModule.prefetch) {
      const isExists = await window.FileUtils.isFileExists('audio', prefetch._id!)
      if (!isExists) {
        SyncModule.setCurrentFetchSong(prefetch._id)
        this.peerHolder.requestSong(prefetch.sender, prefetch._id!)
        return
      }
    }
    this.isFetching = false
  }

  protected handleBroadcasterAudioLoad(song: Song): boolean {
    if (this.peerHolder.peerMode == PeerMode.BROADCASTER) {
      PlayerModule.setState(PlayerState.LOADING)
      this.peerHolder.PlaySong(song)
      return true
    }
    return false
  }

  private initializeRTC(mode: PeerMode) {
    this.peerHolder.peerMode = mode
    SyncModule.setMode(mode)

    this.peerHolder.onJoinedRoom = (id: string) => {
      SyncModule.setRoom(id)
    }
  }

  protected joinRoom(id: string) {
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
}