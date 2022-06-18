<!-- 
  Musicbar.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

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
                :iconType="iconType"
                :iconURL="iconURL"
              />
            </b-col>
            <b-col cols="auto" align-self="center" class="no-gutters controls-col">
              <Controls :duration="currentSong ? currentSong.duration : 0" :timestamp="timestamp" />
            </b-col>
            <b-col cols="4" align-self="center" class="no-gutters extra-col">
              <ExtraControls />
            </b-col>
          </b-row>
        </b-container>
      </div>
    </div>
    <div
      class="slider"
      :class="{ open: sliderPosition, close: !sliderPosition }"
      :style="{ height: `calc(100% - ${!hasFrame ? '7.5rem' : '6rem'})` }"
    >
      <MusicInfo :currentSong="currentSong">
        <AudioStream
          :playerState="playerState"
          :currentSong="currentSong"
          @onTimeUpdate="updateTimestamp"
          :forceSeek="forceSeek"
        />
      </MusicInfo>
    </div>
  </div>
</template>

<script lang="ts">
import AudioStream from '@/mainWindow/components/musicbar/components/AudioStream.vue'
import Controls from '@/mainWindow/components/musicbar/components/Controls.vue'
import Details from '@/mainWindow/components/musicbar/components/Details.vue'
import ExtraControls from '@/mainWindow/components/musicbar/components/ExtraControls.vue'
import MusicInfo from '@/mainWindow/components/musicbar/components/MusicInfo.vue'
import { Component, Watch } from 'vue-property-decorator'
import { mixins } from 'vue-class-component'
import { vxm } from '@/mainWindow/store'
import { bus } from '@/mainWindow/main'
import ImgLoader from '@/utils/ui/mixins/ImageLoader'
import Timestamp from '@/mainWindow/components/musicbar/components/Timestamp.vue'

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
  private forceSeek = 0
  private PlayerState: PlayerState = 'PAUSED'
  private sliderPosition = false
  private hasFrame = false

  private iconType = ''
  private iconURL = ''

  private async getIconType() {
    this.iconURL = ''

    if (this.currentSong) {
      if (this.currentSong.icon) {
        this.iconURL = 'media://' + this.currentSong.icon
        return 'URL'
      }

      if (this.currentSong.providerExtension) {
        const icon = await window.ExtensionUtils.getExtensionIcon(this.currentSong.providerExtension)
        if (icon) {
          this.iconURL = 'media://' + icon
          return 'URL'
        }
      }

      return this.currentSong.type
    }

    return ''
  }

  @Watch('currentSong')
  private async onCurrentSongChange() {
    this.iconType = (await this.getIconType()) ?? ''
  }

  get timestamp() {
    return vxm.player.currentTime
  }

  private updateTimestmp(value: number) {
    bus.$emit('forceSeek', value / 1000)
    this.forceSeek = value / 1000
  }

  get currentSong() {
    return vxm.sync.currentSong ?? vxm.player.currentSong
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

  async mounted() {
    this.hasFrame = await window.WindowUtils.hasFrame()
    bus.$on('onToggleSlider', this.toggleSlider)
    this.iconType = (await this.getIconType()) ?? ''
  }
}
</script>

<style lang="sass" scoped>
.background
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
  background: transparent

.bar-container
  background: var(--primary)
  height: calc(100% - 1rem)

.slider
  position: fixed
  background: var(--primary)
  width: 100%
  // animation: 0.2s linear 0s slide
  transition: transform 0.3s ease
  z-index: -2
.open
  transform: translateY(-4px)

.close
  transform: translateY(100vh)
</style>
