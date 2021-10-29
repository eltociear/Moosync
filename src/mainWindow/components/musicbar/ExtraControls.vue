<!-- 
  ExtraControls.vue is a part of Moosync.
  
  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-row align-h="end" align-v="center" no-gutters>
    <b-col cols="auto" class="slider-container d-flex">
      <input
        type="range"
        min="0"
        max="100"
        class="slider w-100 align-self-center test"
        v-bind:style="{
          background: ComputedGradient
        }"
        id="myRange"
        aria-label="volume"
        v-model="volume"
      />
    </b-col>
    <VolumeIcon class="volume-icon" @click.native="volumeIconClick" :cut="volume == 0" />
    <b-col cols="auto" class="expand-icon ml-3" :class="{ open: sliderOpen }" @click="emitToggleSlider">
      <ExpandIcon />
    </b-col>
  </b-row>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import VolumeIcon from '@/icons/Volume.vue'
import ExpandIcon from '@/icons/Expand.vue'
import { vxm } from '@/mainWindow/store'
import Timestamp from './Timestamp.vue'

@Component({
  components: {
    VolumeIcon,
    ExpandIcon,
    Timestamp
  }
})
export default class MusicBar extends Vue {
  private sliderOpen: boolean = false
  private oldVolume = 50

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
    this.sliderOpen = !this.sliderOpen
    this.$emit('onToggleSlider', this.sliderOpen)
  }

  get ComputedGradient(): string {
    return `linear-gradient(90deg, var(--accent) 0%, var(--accent) ${this.volume}%, var(--textSecondary) 0%)`
  }
}
</script>

<style lang="sass" scoped>
.slider-container
  padding-right: 20px

.slider
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

.expand-icon
  height: 27px
  width: 18px
  transition: transform 0.2s linear

.open
  transform: rotate(180deg)

.test
  min-width: 0
</style>
