<template>
  <div class="d-flex justify-content-end">
    <div class="slider-container d-flex">
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
    </div>
    <div class="volume-icon">
      <VolumeIcon />
    </div>
    <div>
      <div class="expand-icon ml-auto" :class="{ open: sliderOpen }" @click="emitToggleSlider">
        <ExpandIcon />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import VolumeIcon from '@/icons/Volume.vue'
import ExpandIcon from '@/icons/Expand.vue'
import { vxm } from '@/mainWindow/store'

@Component({
  components: {
    VolumeIcon,
    ExpandIcon
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
  height: 22px
  width: 22px
  margin-right: 15px

.expand-icon
  height: 27px
  width: 18px
  transition: transform 0.2s linear

.open
  transform: rotate(180deg)

.test
  min-width: 0
</style>
