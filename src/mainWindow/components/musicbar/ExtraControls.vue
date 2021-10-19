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
    <VolumeIcon class="volume-icon" />
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

  get volume() {
    return vxm.player.volume
  }

  set volume(value: number) {
    vxm.player.volume = value
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
