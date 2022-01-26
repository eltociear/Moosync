<!-- 
  AudioStream.vue is a part of Moosync.
  
  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div>
    <div ref="audioHolder">
      <div id="yt-player" class="yt-player"></div>
      <audio ref="audio" preload="auto" />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Ref, Watch } from 'vue-property-decorator'
import YTPlayer from 'yt-player'
import { mixins } from 'vue-class-component'
import { Player } from '@/utils/ui/players/player'
import { YoutubePlayer } from '@/utils/ui/players/youtube'
import { LocalPlayer } from '@/utils/ui/players/local'
import SyncMixin from '@/utils/ui/mixins/SyncMixin'
import { vxm } from '@/mainWindow/store'
import ErrorHandler from '@/utils/ui/mixins/errorHandler'
import PlayerControls from '@/utils/ui/mixins/PlayerControls'
import Vue from 'vue'

@Component({})
export default class AudioStream extends mixins(SyncMixin, PlayerControls, ErrorHandler) {
  @Ref('audio') audioElement!: HTMLAudioElement

  @Prop({ default: '' })
  roomID!: string

  @Prop({ default: 0 })
  forceSeek!: number

  @Prop({ default: null })
  currentSong!: Song | null | undefined

  /**
   * Player responsible for handling current song
   * May switch between youtube and local
   */
  private activePlayer!: Player

  /**
   * Instance of youtube embed player
   */
  private ytPlayer!: YoutubePlayer

  /**
   * Instance of Local html audio tag player
   */
  private localPlayer!: LocalPlayer

  /**
   * Holds type of player which is current active
   */
  private activePlayerType!: PlayerType

  /**
   * True is page has just loaded and a new song is to be loaded into the player
   * Otherwise false
   */
  private isFirst: boolean = true

  /**
   * True if vuex state change is not to be reflected on active player
   * When player is paused or played from an external source, the onStateChange event triggers
   * and the vuex player state is changed respectively. This flag is set to true to avoid setting
   * the same state on active player again
   */
  private ignoreStateChange = false

  /**
   * True is playerstate is set to be 'PLAYING' ignoring its previous value on new song load
   */
  private forcePlay = false

  private _bufferTrap: ReturnType<typeof setTimeout> | undefined

  get songRepeat() {
    return vxm.player.Repeat
  }

  get volume() {
    return vxm.player.volume
  }

  /**
   * Method called when vuex player state changes
   * This method is responsible for reflecting that state on active player
   */
  async onPlayerStateChanged(newState: PlayerState) {
    if (!this.ignoreStateChange) {
      await this.handleActivePlayerState(newState)
    }

    this.ignoreStateChange = false
    this.emitPlayerState(newState)
  }

  /**
   * Method called when player type changes
   * This method is responsible of detaching old player
   * and setting new player as active
   */
  private onPlayerTypeChanged(newType: PlayerType) {
    if (this.activePlayerType !== newType) {
      this.unloadAudio()
      this.activePlayer.removeAllListeners()
      this.activePlayerType = newType

      switch (newType) {
        case 'LOCAL':
          this.activePlayer = this.localPlayer
          break
        case 'YOUTUBE':
          this.activePlayer = this.ytPlayer
          break
      }

      this.activePlayer.volume = vxm.player.volume
      this.registerPlayerListeners()
    }
  }

  /**
   * Method triggered when currentSong prop changes
   * This method is responsible for loading the current song in active player
   * or unloading the player if current song is empty
   */
  @Watch('currentSong')
  onSongChanged(newSong: Song | null | undefined) {
    if (newSong) this.loadAudio(newSong, false)
    else this.unloadAudio()
  }

  /**
   * Method triggered when vuex volume changes
   */
  onVolumeChanged(newValue: number) {
    this.activePlayer.volume = newValue
  }

  /**
   * Method triggered when user seeks on timeline and forceSeek prop changes
   */
  @Watch('forceSeek') onSeek(newValue: number) {
    this.activePlayer.currentTime = newValue
    this.remoteSeek(newValue)
  }

  mounted() {
    this.setupPlayers()
    this.setupSync()
    this.registerListeners()

    if (this.currentSong) this.loadAudio(this.currentSong, true)
  }

  /**
   * Initial setup for all players
   */
  private setupPlayers() {
    this.ytPlayer = new YoutubePlayer(new YTPlayer('#yt-player'))
    this.localPlayer = new LocalPlayer(this.audioElement)
    this.activePlayer = this.localPlayer
    this.activePlayerType = 'LOCAL'
  }

  private setupSync() {
    this.setSongSrcCallback = (src: string) => this.activePlayer.load(src)
    this.onSeekCallback = (time: number) => (this.activePlayer.currentTime = time)
  }

  private registerRoomListeners() {
    this.$root.$on('join-room', (data: string) => this.joinRoom(data))
    this.$root.$on('create-room', () => this.createRoom())
  }

  private async onSongEnded() {
    this.forcePlay = true
    if (this.songRepeat) {
      // Re load entire audio instead of setting current time to 0
      this.loadAudio(this.currentSong!, false)
    } else {
      await vxm.player.nextSong()
    }
  }

  /**
   * Register all listeners related to players
   */
  private registerPlayerListeners() {
    if (vxm.player.loading) {
      vxm.player.loading = false
    }

    this.activePlayer.onTimeUpdate = (time) => this.$emit('onTimeUpdate', time)
    this.activePlayer.onError = (err) => {
      console.error(err)
      console.error(`${this.currentSong?._id}: ${this.currentSong?.title} unplayable, skipping.`)
      this.removeFromQueue(vxm.player.queueIndex)
      this.nextSong()
      this.handlerFileError(err)
    }
    this.activePlayer.onStateChange = (state) => {
      // Cued event of youtube embed seems to fire only once and is not reliable
      // Stop loading when state of player changes
      vxm.player.loading = false
      this.cancelBufferTrap()

      if (state === 'STOPPED') {
        this.onSongEnded()
        return
      }

      if (state !== vxm.player.playerState) {
        this.ignoreStateChange = true
        vxm.player.playerState = state
      }
    }

    this.activePlayer.onLoad = () => {
      vxm.player.loading = false
      this.cancelBufferTrap()
    }

    this.activePlayer.onBuffer = () => {
      vxm.player.loading = true
      this.setBufferTrap()
    }

    vxm.player.$watch('volume', this.onVolumeChanged)
  }

  /**
   * If the player is buffering for a long time then try changing its playback quality
   */
  private setBufferTrap() {
    this._bufferTrap = setTimeout(() => {
      if (this.activePlayerType === 'YOUTUBE' && this.activePlayer instanceof YoutubePlayer) {
        this.activePlayer.setPlaybackQuality('small')
      }
    }, 10000)
  }

  private cancelBufferTrap() {
    if (this._bufferTrap) {
      clearTimeout(this._bufferTrap)
      this._bufferTrap = undefined
    }
  }

  private registerListeners() {
    this.registerPlayerListeners()
    this.registerRoomListeners()

    vxm.player.$watch('playerState', this.onPlayerStateChanged)
  }

  /**
   * Sets current player's state to vuex player state
   */
  private handleFirstPlayback(loadedState: boolean) {
    if (this.isFirst || vxm.player.queue.order.length === 1) {
      if (!loadedState) {
        vxm.player.playerState = 'PLAYING'
      }
      this.isFirst = false
    }
  }

  private getPlaybackUrlAndDuration(song: Song) {
    if (song.type === 'YOUTUBE') {
      return vxm.providers.youtubeProvider.getPlaybackUrlAndDuration(song)
    }

    if (song.type === 'SPOTIFY') {
      return vxm.providers.spotifyProvider.getPlaybackUrlAndDuration(song)
    }
  }

  /**
   * Set media info which is recognised by different applications and OS specific API
   */
  private setMediaInfo(song: Song) {
    if (navigator.mediaSession) {
      const artwork: MediaImage[] = []
      if (song.song_coverPath_low) {
        artwork.push({ src: song.song_coverPath_low })
      }
      if (song.song_coverPath_high) {
        artwork.push({ src: song.song_coverPath_high })
      }
      if (song.album?.album_coverPath_high) {
        artwork.push({ src: song.album.album_coverPath_high })
      }
      if (song.album?.album_coverPath_low) {
        artwork.push({ src: song.album.album_coverPath_low })
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artists && song.artists.join(', '),
        album: song.album?.album_name,
        artwork
      })
      navigator.mediaSession.setActionHandler('nexttrack', () => this.nextSong())
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prevSong())
      navigator.mediaSession.setActionHandler('seekto', (data) => data.seekTime && (this.forceSeek = data.seekTime))
    }
  }

  private async loadAudio(song: Song, loadedState: boolean) {
    this.unloadAudio()

    if (song.type === 'LOCAL') {
      this.onPlayerTypeChanged('LOCAL')
    } else {
      this.onPlayerTypeChanged('YOUTUBE')
    }

    vxm.player.loading = true
    if (song.type === 'LOCAL') {
      if (song.path) {
        this.activePlayer.load('media://' + song.path, this.volume, this.playerState === 'PLAYING')
        vxm.player.loading = false
      }
    } else {
      if (!song.playbackUrl || !song.duration) {
        const res = await this.getPlaybackUrlAndDuration(song)
        if (res) {
          // Shouldn't react on property set normally
          vxm.player.currentSong!.duration = res.duration
          Vue.set(song, 'playbackUrl', res.url)
        }
        return
      }

      this.activePlayer.load(song.playbackUrl, this.volume, this.playerState !== 'PAUSED')
    }

    if (this.forcePlay) {
      this.forcePlay = false
      vxm.player.playerState = 'PLAYING'
    }

    if (this.handleBroadcasterAudioLoad(song)) return

    this.handleFirstPlayback(loadedState)

    this.setMediaInfo(song)
  }

  private unloadAudio() {
    this.activePlayer.stop()
  }

  private async handleActivePlayerState(newState: PlayerState) {
    try {
      switch (newState) {
        case 'PLAYING':
          return this.activePlayer.play()
        case 'PAUSED':
          return this.activePlayer.pause()
        case 'STOPPED':
          return this.unloadAudio()
      }
    } catch (e) {
      this.handlerFileError(e as ErrorEvent)
      this.nextSong()
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>

<style lang="sass">
.yt-player
  width: 0
</style>
