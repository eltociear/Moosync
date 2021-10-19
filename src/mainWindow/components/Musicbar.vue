<template>
  <div class="musicbar-content d-flex">
    <div class="background w-100">
      <div class="musicbar h-100">
        <VueSlider
          :min="0"
          :max="currentSong ? Math.ceil((currentSong.duration + 1) * 1000) : 0"
          class="timeline pl-2 pr-2"
          :interval="1"
          :dotSize="10"
          :value="Math.ceil(timestamp * 1000)"
          :duration="0.1"
          :tooltip="'none'"
          @change="updateTimestmp"
        />
        <b-container fluid class="d-flex bar-container h-100 pb-2">
          <b-row
            no-gutters
            align-v="center"
            align-h="center"
            align-content="center"
            class="d-flex no-gutters w-100 control-row"
          >
            <b-col cols="4" class="no-gutters details-col w-100">
              <Details
                :title="currentSong ? currentSong.title : '-'"
                :artists="currentSong ? currentSong.artists : []"
                :imgSrc="cover"
              />
            </b-col>
            <b-col cols="auto" align-self="center" class="no-gutters controls-col">
              <Controls :duration="currentSong ? currentSong.duration : 0" :timestamp="timestamp" />
            </b-col>
            <b-col cols="4" align-self="center" class="no-gutters extra-col">
              <ExtraControls @onToggleSlider="toggleSlider" />
            </b-col>
          </b-row>
        </b-container>
      </div>
      <AudioStream
        :playerState="playerState"
        :currentSong="currentSong"
        @onTimeUpdate="updateTimestamp"
        :forceSeek="forceSeek"
      />
    </div>
    <div class="slider" :class="{ open: sliderPosition, close: !sliderPosition }">
      <MusicInfo :currentSong="currentSong" />
    </div>
  </div>
</template>

<script lang="ts">
import AudioStream from '@/mainWindow/components/AudioStream.vue'
import Controls from '@/mainWindow/components/musicbar/Controls.vue'
import Details from '@/mainWindow/components/musicbar/Details.vue'
import ExtraControls from '@/mainWindow/components/musicbar/ExtraControls.vue'
import MusicInfo from '@/mainWindow/components/musicbar/MusicInfo.vue'
import { Component } from 'vue-property-decorator'
import { mixins } from 'vue-class-component'
import { vxm } from '../store'
import { bus } from '@/mainWindow/main'
import ImgLoader from '@/utils/ui/mixins/ImageLoader'
import Timestamp from './musicbar/Timestamp.vue'

@Component({
  components: {
    Details,
    Controls,
    ExtraControls,
    AudioStream,
    MusicInfo,
    Timestamp
  }
})
export default class MusicBar extends mixins(ImgLoader) {
  private forceSeek: number = 0
  private PlayerState: PlayerState = 'PAUSED'
  private sliderPosition: boolean = false

  get timestamp() {
    return vxm.player.currentTime
  }

  private updateTimestmp(value: number) {
    bus.$emit('forceSeek', value / 1000)
    this.forceSeek = value / 1000
  }

  get currentSong() {
    return vxm.sync.currentSongDets ?? vxm.player.currentSong
  }

  get remoteCover() {
    return vxm.sync.currentCover
  }

  get playerState() {
    return vxm.player.playerState
  }

  get cover() {
    return this.remoteCover ? this.remoteCover : this.getImgSrc(this.getValidImageLow(vxm.player.currentSong))
  }

  private toggleSlider(position: boolean) {
    this.sliderPosition = position
  }

  private updateTimestamp(timestamp: number) {
    vxm.player.currentTime = timestamp
  }
}
</script>

<style lang="sass" scoped>
.background
  background: var(--primary)
  position: fixed
  bottom: 0
  height: 6rem

.timeline-container
  height: 1rem
  width: 100%

.timeline
  background: transparent
  height: 0.5rem !important
  width: 100%
  padding: 0 15px 0 15px !important

.musicbar
  position: relative

.bar-container
  height: calc(100% - 1rem)

.slider
  position: fixed
  background: var(--primary)
  height: calc(100% - 7.5rem)
  width: 100%
  // animation: 0.2s linear 0s slide
  transition: transform 0.3s ease
  z-index: -2
.open
  transform: translateY(-4px)

.close
  transform: translateY(100vh)
</style>

<style lang="sass">
.vue-slider-process
  background-color: var(--accent)

.vue-slider-rail
  background-color: var(--tertiary)

.control-row
  position: relative

.details-col, .extra-col
  position: absolute

.details-col
  left: 0

.extra-col
  right: 0
</style>
