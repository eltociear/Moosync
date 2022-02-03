/* 
 *  syncHandler.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { FragmentReceiver, FragmentSender } from './dataFragmenter'
import { ManagerOptions, Socket, io } from 'socket.io-client'

import { PeerMode } from '@/mainWindow/store/syncState'
import { toRemoteSong } from '@/utils/common'

enum peerConnectionState {
  CONNECTED,
  CONNECTING,
  DISCONNECTED,
}

export class SyncHolder {
  private peerConnection: {
    [key: string]: {
      peer?: RTCPeerConnection
      coverChannel?: RTCDataChannel
      streamChannel?: RTCDataChannel
    }
  } = {}
  private socketConnection?: Socket
  private mode: PeerMode = PeerMode.UNDEFINED
  private BroadcasterID: string = ''
  private isNegotiating: { [id: string]: boolean } = {}
  public socketID: string = ''
  private connectionOptions: Partial<ManagerOptions> = {
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 2,
    timeout: 10000,
    transports: ['websocket'],
  }
  private isListeningReady: boolean = false

  private initialized: boolean = false

  private STUN = {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:stun3.l.google.com:19302',
      'stun:stun4.l.google.com:19302',
      'stun:stun.ekiga.net',
      'stun:stun.ideasip.com',
      'stun:stun.rixtelecom.se',
      'stun:stun.schlund.de',
      'stun:stun.stunprotocol.org:3478',
      'stun:stun.voiparound.com',
      'stun:stun.voipbuster.com',
      'stun:stun.voipstunt.com',
      'stun:stun.voxgratia.org',
    ],
  }

  private TURN = {
    urls: 'turn:retardnetwork.cf:7888',
    username: 'oveno',
    credential: '1234',
  }

  private readyPeers: string[] = []

  private onJoinedRoomCallback?: (id: string) => void
  private onRemoteTrackInfoCallback?: (event: RemoteSong, from: string, songIndex: number) => void
  private onRemoteTrackCallback?: (event: RTCTrackEvent) => void
  private onRemoteCoverCallback?: (event: Blob) => void
  private onRemoteStreamCallback?: (event: Blob) => void
  private onPlayerStateChangeCallback?: (state: PlayerState) => void
  private onSeekCallback?: (time: number) => void
  private onPeerStateChangeCallback?: (id: string, state: peerConnectionState) => void
  private onDataSentCallback?: (id: string) => void
  private onAllReadyCallback?: () => void
  private onReadyRequestedCallback?: (value: boolean) => void
  private onQueueOrderChangeCallback?: (order: QueueOrder, index: number) => void
  private onQueueDataChangeCallback?: (data: QueueData<RemoteSong>) => void
  private playRequestedSongCallback?: (songIndex: number) => void

  private getCurrentSong?: () => Song | null | undefined
  private getLocalSong?: (songID: string) => Promise<ArrayBuffer | null>
  private getLocalCoverCallback?: (songID: string) => Promise<ArrayBuffer | null>

  constructor() {
    const handler = {
      get: function (obj: any, methodName: any) {
        return typeof obj[methodName] !== "function"
          ? obj[methodName]
          : function (...args: any[]) {
            if (obj.isInitialized(methodName)) {
              return obj[methodName](...args);
            }
          };
      },
    };

    return new Proxy(this, handler);
  }

  public isInitialized(methodName: keyof SyncHolder) {
    if (methodName !== 'isInitialized' && methodName !== 'initialize') {
      if (!this.socketConnection) {
        throw new Error("Handler not initialized, call initialize()")
      }

      return this.initialized
    }
    return true
  }

  public async initialize(url?: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.socketConnection = io(url ? url : 'http://localhost:4000', this.connectionOptions)
      this.socketConnection.on('connect', () => {
        this.socketID = this.socketConnection!.id
        this.initialized = true
        resolve(true)
      })

      let tries = 0

      this.socketConnection?.on('connect_error', (error: Error) => {
        tries++
        if (tries === 3)
          reject(error)
      })

      this.joinedRoom()
    })
  }

  set onJoinedRoom(callback: (id: string) => void) {
    this.onJoinedRoomCallback = callback
  }

  set onRemoteTrackInfo(callback: (event: RemoteSong, from: string, songIndex: number) => void) {
    this.onRemoteTrackInfoCallback = callback
  }

  set onRemoteTrack(callback: (event: RTCTrackEvent) => void) {
    this.onRemoteTrackCallback = callback
  }

  set getLocalCover(callback: (songID: string) => Promise<ArrayBuffer | null>) {
    this.getLocalCoverCallback = callback
  }

  set onRemoteCover(callback: (event: Blob) => void) {
    this.onRemoteCoverCallback = callback
  }

  set onRemoteStream(callback: (event: Blob) => void) {
    this.onRemoteStreamCallback = callback
  }

  set fetchSong(callback: (songID: string) => Promise<ArrayBuffer | null>) {
    this.getLocalSong = callback
  }

  set fetchCurrentSong(callback: () => Song | null | undefined) {
    this.getCurrentSong = callback
  }

  set onSeek(callback: (time: number) => void) {
    this.onSeekCallback = callback
  }

  set playerStateHandler(callback: (state: PlayerState) => void) {
    this.onPlayerStateChangeCallback = callback
  }

  set peerConnectionStateHandler(callback: (id: string, state: peerConnectionState) => void) {
    this.onPeerStateChangeCallback = callback
  }

  set onDataSent(callback: (id: string) => void) {
    this.onDataSentCallback = callback
  }

  set onAllReady(callback: () => void) {
    this.onAllReadyCallback = callback
  }

  set onReadyRequested(callback: (value: boolean) => void) {
    this.onReadyRequestedCallback = callback
  }

  set getRequestedSong(callback: (songIndex: number) => void) {
    this.playRequestedSongCallback = callback
  }

  set onQueueOrderChange(callback: (order: QueueOrder, index: number) => void) {
    this.onQueueOrderChangeCallback = callback
  }

  set onQueueDataChange(callback: (data: QueueData<RemoteSong>) => void) {
    this.onQueueDataChangeCallback = callback
  }

  set peerMode(mode: PeerMode) {
    this.mode = mode
  }

  get peerMode() {
    return this.mode
  }

  private handleCoverChannel(channel: RTCDataChannel) {
    const fragmentReceiver = new FragmentReceiver(this.onRemoteCoverCallback)

    channel.onmessage = (event) => {
      fragmentReceiver.receive(event.data)
    }
  }

  private handleStreamChannel(channel: RTCDataChannel) {
    const fragmentReceiver = new FragmentReceiver(this.onRemoteStreamCallback)

    channel.onmessage = (event) => {
      fragmentReceiver.receive(event.data)
    }
  }

  private addRemoteCandidate() {
    this.socketConnection?.on('candidate', (id: string, candidate: RTCIceCandidate) => {
      this.peerConnection[id].peer!.addIceCandidate(new RTCIceCandidate(candidate))
    })
  }

  private onLocalCandidate(id: string, peer: RTCPeerConnection) {
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        this.socketConnection?.emit('candidate', id, event.candidate)
      }
    }
  }

  private joinedRoom() {
    this.socketConnection?.on('joinedRoom', (roomID: string, isCreator: boolean) => {
      this.onJoinedRoomCallback && this.onJoinedRoomCallback(roomID)
      if (isCreator) {
        const song = this.getCurrentSong ? toRemoteSong(this.getCurrentSong(), this.socketID) : null
        if (song) {
          this.PlaySong(song)
        }
      }
    })
  }

  private listenPeerConnected(id: string, peer: RTCPeerConnection) {
    peer.onconnectionstatechange = (e) => {
      if (this.onPeerStateChangeCallback) {
        switch ((e.target as RTCPeerConnection).connectionState) {
          case 'connected':
            this.onPeerStateChangeCallback(id, peerConnectionState.CONNECTED)
            break
          case 'disconnected':
          case 'failed':
            this.onPeerStateChangeCallback(id, peerConnectionState.DISCONNECTED)
        }
      }
    }
  }

  private onDataSentHandler(id: string) {
    // TODO: Show state of each user on ui
    this.onDataSentCallback ? this.onDataSentCallback(id) : null
  }

  private sendStream(id: string, stream: ArrayBuffer | null, channel: RTCDataChannel) {
    if (channel.readyState == 'open') {
      try {
        const fragmentSender = new FragmentSender(stream, channel, () => this.onDataSentHandler(id))
        fragmentSender.send()
      } catch (e) {
        console.error(e)
      }
      return
    }
    console.info('data channel', channel.label, 'is in state: ', this.peerConnection[id].streamChannel!.readyState)
  }

  public PlaySong(song: Song) {
    this.sendSongDetails(toRemoteSong(song, this.socketID))
    this.requestReadyStatus()
  }

  public createRoom() {
    this.socketConnection?.emit('createRoom')
  }

  private onStream(id: string, peer: RTCPeerConnection) {
    peer.ontrack = (event: RTCTrackEvent) => {
      if (this.mode == PeerMode.WATCHER && id == this.BroadcasterID) {
        this.onRemoteTrackCallback && this.onRemoteTrackCallback(event)
      }
    }
  }

  private onDataChannel(id: string, peer: RTCPeerConnection) {
    peer.ondatachannel = (event) => {
      const channel = event.channel
      if (channel.label === 'cover-channel') {
        this.handleCoverChannel(channel)
        this.setCoverChannel(id, channel)
      } else if (channel.label === 'stream-channel') {
        this.handleStreamChannel(channel)
        this.setStreamChannel(id, channel)
      }
    }
  }

  public joinRoom(id: string) {
    this.socketConnection?.emit('joinRoom', id)
  }

  /**
   * Requests ready from all peers in room
   * Should be called after trackChange when playerState is set to LOADING
   * [Broadcaster method]
   */
  private requestReadyStatus() {
    if (Object.keys(this.peerConnection).length == 0) {
      this.checkAllReady()
      return
    }
    this.isListeningReady = true
    this.socketConnection?.emit('requestReady')
  }

  /**
   * Listen for readyRequest from Broadcaster
   * The receiving peer should then emit "ready" whenever it has the required song
   * [Watcher Method]
   */
  private listenReadyRequest() {
    this.socketConnection?.on('requestReady', () => {
      this.onReadyRequestedCallback && this.onReadyRequestedCallback(true)
    })
  }

  private sendSongBuffer(id: string, songID: string) {
    this.getLocalSong
      && this.getLocalSong(songID).then((buf) => this.sendStream(id, buf, this.peerConnection[id].streamChannel!))
  }

  private sendCoverBuffer(id: string, songID: string) {
    this.getLocalCoverCallback
      && this.getLocalCoverCallback(songID).then((buf) => this.sendStream(id, buf, this.peerConnection[id].coverChannel!))
  }

  /**
   * Listen to events related to fetching of song and cover
   */
  private listenRequests() {
    this.socketConnection?.on('requestedSong', (id: string, songID: string) => {
      this.sendSongBuffer(id, songID)
    })

    this.socketConnection?.on('requestedCover', (id: string, songID: string) => {
      this.sendCoverBuffer(id, songID)
    })
  }

  /**
   * Listens play requests emitted by websocket server
   * The peer receiving this method should become the broadcaster and trackChange to the song
   * [Broadcaster method]
   */
  private listenPlayRequests() {
    this.socketConnection?.on('requestedPlay', (songIndex: number) => {
      this.playRequestedSongCallback && this.playRequestedSongCallback(songIndex)
    })
  }

  /**
   * Listens for track change
   */
  private listenTrackChange() {
    this.socketConnection?.on('trackChange', (metadata: RemoteSong, from: string, song_index: number) => {
      this.onRemoteTrackInfoCallback && this.onRemoteTrackInfoCallback(metadata, from, song_index)
    })
  }

  /**
   * Listens to ready emitted by peer in room
   * [Broadcaster Method]
   */
  private listenPeerReady() {
    this.socketConnection?.on('ready', (id: string) => {
      if (this.isListeningReady) {
        this.setPeerReady(id)
        this.checkAllReady()
      }
    })
  }

  /**
   * Listens to check if the broadcaster of current song has emitted allReady
   * [Watcher method]
   */
  private listenAllReady() {
    this.socketConnection?.on('allReady', () => {
      this.onAllReadyCallback && this.onAllReadyCallback()
      this.onPlayerStateChangeCallback && this.onPlayerStateChangeCallback('PLAYING')
    })
  }

  /**
   * Checks if all peers in room emitted ready
   * [Broadcaster method]
   * TODO: Add a timeout after which allReady will be emitted irrespective of who emitted ready
   */
  private checkAllReady() {
    if (this.readyPeers.length == Object.keys(this.peerConnection).length) {
      this.socketConnection?.emit('allReady')
      this.readyPeers = []
      this.isListeningReady = false
      this.onPlayerStateChangeCallback && this.onPlayerStateChangeCallback('PLAYING')
      this.onAllReadyCallback && this.onAllReadyCallback()
    }
  }

  /**
   * Listens to websocket events for change in playerState
   */
  private listenPlayerState() {
    this.socketConnection?.on('playerStateChange', (state: PlayerState) => {
      this.onPlayerStateChangeCallback && this.onPlayerStateChangeCallback(state)
    })
  }

  /**
   * Listens to websocket events for seek
   */
  private listenSeek() {
    this.socketConnection?.on('forceSeek', (time: number) => {
      this.onSeekCallback && this.onSeekCallback(time)
    })
  }

  private listenQueueUpdate() {
    this.socketConnection?.on('onQueueOrderChange', (order: QueueOrder, index: number) => {
      this.onQueueOrderChangeCallback && this.onQueueOrderChangeCallback(order, index)
    })

    this.socketConnection?.on('onQueueDataChange', (data: QueueData<RemoteSong>) => {
      this.onQueueDataChangeCallback && this.onQueueDataChangeCallback(data)
    })
  }

  /**
   * Requests song (File/Buffer) from peer
   * @param id of peer to get song from
   * @param songID id of song
   */
  public requestSong(id: string, songID: string) {
    this.socketConnection?.emit('requestSong', id, songID)
  }

  /**
   * Requests cover from peer
   * @param id of peer to get cover from
   * @param songID id of song to which track belongs to
   */
  public requestCover(id: string, songID: string) {
    this.socketConnection?.emit('requestCover', id, songID)
  }

  /**
   * Sends song index to websocket server.
   * The server then finds the peer responsible for adding the song in queue
   * and requests it to change its track
   *
   * Should be called when a song already in queue is to be played
   * @param song_index
   */
  public requestPlay(song_index: number) {
    this.socketConnection?.emit('requestPlay', song_index)
  }

  public emitQueueChange(order: QueueOrder, data: QueueData<RemoteSong>, index: number) {
    this.socketConnection?.emit('queueChange', order, data, index)
  }

  /**
   * Emits ready
   */
  public emitReady() {
    this.socketConnection?.emit('ready')
    this.onReadyRequestedCallback ? this.onReadyRequestedCallback(false) : null
  }

  /**
   * Emits player state to all peers in room
   * Should be called when local player is set to pause/play or unloads audio
   * @param state
   */
  public emitPlayerState(state: PlayerState) {
    this.socketConnection?.emit('playerStateChange', state)
  }

  /**
   * Sends time to all peers in room.
   * Should be called after local player seeks to a time
   * @param time
   */
  public emitSeek(time: number) {
    this.socketConnection?.emit('forceSeek', time)
  }

  /**
   * Send song details to room over websocket
   * @param trackInfo
   * @param song_index index of song in room queue
   */
  private sendSongDetails(trackInfo: RemoteSong | null | undefined) {
    if (trackInfo) {
      this.socketConnection?.emit('trackMetadata', this.stripSong(trackInfo))
    }
  }

  /**
   * Sends cover through data channels to a peer
   * @param id of peer to send cover to
   * @param [cover] ArrayBuffer of image file
   */
  private sendCover(id: string, cover?: ArrayBuffer) {
    if (cover) {
      const fragmentSender = new FragmentSender(cover, this.peerConnection[id].coverChannel!)
      fragmentSender.send()
    }
  }

  /**
   * Strips song
   * @param song
   * @returns song with paths removed
   */
  private stripSong(song?: RemoteSong): RemoteSong {
    const tmp: RemoteSong = JSON.parse(JSON.stringify(song))
    delete tmp.path
    delete tmp.lyrics

    if (tmp.album) {
      // If the image is hosted somewhere then surely the client on the other end can load it... right?
      if (!tmp.album?.album_coverPath_low?.startsWith('http'))
        delete tmp.album.album_coverPath_low

      if (!tmp.album?.album_coverPath_high?.startsWith('http'))
        delete tmp.album.album_coverPath_high
    }

    if (!tmp.song_coverPath_low?.startsWith('http'))
      delete tmp.song_coverPath_low

    if (!tmp.song_coverPath_high?.startsWith('http'))
      delete tmp.song_coverPath_high

    return tmp
  }

  private setPeerReady(id: string) {
    if (!this.readyPeers.includes(id)) {
      this.readyPeers.push(id)
    }
  }

  /**
   * Signalling methods
   */

  public start() {
    this.addRemoteCandidate()
    this.onOffer()
    this.onUserJoined()
    this.onAnswer()
    this.listenPeerReady()
    this.listenRequests()
    this.listenTrackChange()
    this.listenQueueUpdate()
    this.listenPlayerState()
    this.listenSeek()
    this.listenReadyRequest()
    this.listenAllReady()
    this.listenPlayRequests()
  }

  private makePeer(id: string): RTCPeerConnection {
    // Creates new peer
    const peer = new RTCPeerConnection({ iceServers: [this.STUN, this.TURN] })

    // Report changes to connection state
    this.listenPeerConnected(id, peer)
    if (this.onPeerStateChangeCallback) this.onPeerStateChangeCallback(id, peerConnectionState.CONNECTING)

    this.onLocalCandidate(id, peer)
    return peer
  }

  private setPeer(id: string, peer: RTCPeerConnection) {
    if (this.peerConnection[id]) this.peerConnection[id].peer = peer
    else this.peerConnection[id] = { peer: peer }
  }
  private setCoverChannel(id: string, coverChannel: RTCDataChannel) {
    if (this.peerConnection[id]) this.peerConnection[id].coverChannel = coverChannel
    else this.peerConnection[id] = { coverChannel: coverChannel }
  }

  private setStreamChannel(id: string, streamChannel: RTCDataChannel) {
    if (this.peerConnection[id]) this.peerConnection[id].streamChannel = streamChannel
    else this.peerConnection[id] = { streamChannel: streamChannel }
  }

  private makeDataChannel(id: string, peer: RTCPeerConnection) {
    const coverChannel = peer.createDataChannel('cover-channel')
    const streamChannel = peer.createDataChannel('stream-channel')

    this.handleCoverChannel(coverChannel)
    this.handleStreamChannel(streamChannel)
    this.setCoverChannel(id, coverChannel)
    this.setStreamChannel(id, streamChannel)
  }

  private onOffer() {
    this.socketConnection?.on('offer', (id: string, description: RTCSessionDescription) => {
      this.setupWatcher(id, description)
    })
  }

  private onUserJoined() {
    this.socketConnection?.on('userJoined', (id: string) => {
      this.playerStateHandler ? this.playerStateHandler('PAUSED') : null
      this.setupInitiator(id)
      this.requestReadyStatus()
    })
  }

  private listenSignalingState(id: string, peer: RTCPeerConnection): void {
    peer.onsignalingstatechange = (e) => {
      this.isNegotiating[id] = (e.target as RTCPeerConnection).signalingState != 'stable'
    }
  }

  private setupInitiator(id: string) {
    const peer = this.makePeer(id)
    this.listenSignalingState(id, peer)
    this.makeDataChannel(id, peer)

    this.needsNegotiation(id, peer)

    this.setPeer(id, peer)
  }

  private makeOffer(id: string, peer: RTCPeerConnection) {
    // Send offer to signalling server
    peer
      .createOffer()
      .then((sdp) => peer.setLocalDescription(sdp))
      .then(() => this.socketConnection?.emit('offer', id, peer.localDescription))
  }

  private onAnswer() {
    this.socketConnection?.on('answer', (id: string, description: RTCSessionDescription) => {
      if (this.isNegotiating[id]) this.peerConnection[id].peer!.setRemoteDescription(description)
    })
  }

  private needsNegotiation(id: string, peer: RTCPeerConnection) {
    peer.onnegotiationneeded = () => {
      if (!this.isNegotiating[id]) {
        this.isNegotiating[id] = true
        this.makeOffer(id, peer)
      }
    }
  }

  private setupWatcher(id: string, description: RTCSessionDescription) {
    let peer: RTCPeerConnection

    if (this.peerConnection[id] && this.peerConnection[id].peer) peer = this.peerConnection[id].peer!
    else peer = this.makePeer(id)

    this.listenSignalingState(id, peer)
    this.onDataChannel(id, peer)
    this.onStream(id, peer)

    peer
      .setRemoteDescription(description)
      .then(() => peer.createAnswer())
      .then((sdp) => peer.setLocalDescription(sdp))
      .then(() => this.socketConnection?.emit('answer', id, peer.localDescription))

    this.setPeer(id, peer)
  }
}
