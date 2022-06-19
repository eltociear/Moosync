<!-- 
  ExtraControls.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-row align-h="end" align-v="center" no-gutters>
    <b-col
      cols="auto"
      class="slider-container d-flex"
      :style="{ opacity: `${showVolume ? '1' : ''}` }"
      @mouseenter="handleSliderMouseEnter"
      @mouseleave="handleSliderMouseLeave"
    >
      <input
        type="range"
        min="0"
        max="100"
        class="slider w-100 align-self-center"
        v-bind:style="{
          background: ComputedGradient
        }"
        id="myRange"
        aria-label="volume"
        v-model="volume"
      />
    </b-col>
    <b-col cols="auto">
      <VolumeIcon
        class="volume-icon align-self-center"
        @click.native="volumeIconClick"
        :cut="volume == 0"
        @mouseenter.native="handleVolumeIconMouseEnter"
        @mouseleave.native="handleVolumeIconMouseLeave"
      />
    </b-col>
    <b-col cols="auto" class="expand-icon ml-3" :class="{ open: sliderOpen }" @click="emitToggleSlider">
      <ExpandIcon />
    </b-col>
  </b-row>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import VolumeIcon from '@/icons/VolumeIcon.vue'
import ExpandIcon from '@/icons/ExpandIcon.vue'
import { vxm } from '@/mainWindow/store'
import Timestamp from '@/mainWindow/components/musicbar/components/Timestamp.vue'
import { bus } from '@/mainWindow/main'

@Component({
  components: {
    VolumeIcon,
    ExpandIcon,
    Timestamp
  }
})
export default class ExtraControls extends Vue {
  private sliderOpen = false
  private oldVolume = 50

  private volumeIconHover = false
  private showVolume = false

  get volume() {
    return vxm.player.volume
  }

  set volume(value: number) {
    // Fuck javascript floating precision
    value = Math.floor(value)
    vxm.player.volume = value
    if (value != 0) {
      this.oldVolume = value
    }
  }

  private volumeIconClick() {
    if (this.volume !== 0) {
      this.oldVolume = this.volume
      this.volume = 0
    } else {
      this.volume = this.oldVolume
    }
  }

  private emitToggleSlider() {
    bus.$emit('onToggleSlider', !this.sliderOpen)
  }

  mounted() {
    bus.$on('onToggleSlider', () => {
      this.sliderOpen = !this.sliderOpen
    })
  }

  get ComputedGradient(): string {
    return `linear-gradient(90deg, var(--accent) 0%, var(--accent) ${this.volume}%, var(--textSecondary) 0%)`
  }

  private handleVolumeIconMouseEnter() {
    this.volumeIconHover = true
    this.showVolume = true
  }

  private leaveTimeout: ReturnType<typeof setTimeout> | undefined

  private handleVolumeIconMouseLeave() {
    this.volumeIconHover = false

    this.leaveTimeout = setTimeout(() => {
      this.showVolume = false
    }, 150)
  }

  private handleSliderMouseEnter() {
    if (this.volumeIconHover) {
      this.showVolume = true
    }
    this.leaveTimeout && clearTimeout(this.leaveTimeout)
  }

  private handleSliderMouseLeave() {
    this.showVolume = false
    this.leaveTimeout && clearTimeout(this.leaveTimeout)
  }
}
</script>

<style lang="sass" scoped>
.slider-container
  padding-right: 20px

.slider
  right: 0
  -webkit-appearance: none
  height: 2px
  outline: none

.slider::-webkit-slider-thumb
  -webkit-appearance: none
  appearance: none
  width: 12px
  height: 12px
  border-radius: 50%
  background: var(--accent)

.slider::-ms-fill-upper
  background-color: var(--primary)

.volume-icon
  width: 22px
  &:hover
    .slider-container
      opacity: 1
      display: block

.expand-icon
  display: block
  height: 27px
  width: 18px
  transition: transform 0.2s linear

.open
  transform: rotate(180deg)

.test
  min-width: 0

$mini-player: "only screen and (max-width : 800px)"
@media #{$mini-player}
  .expand-icon
    display: none

  .slider-container
    right: -230px !important
</style>
