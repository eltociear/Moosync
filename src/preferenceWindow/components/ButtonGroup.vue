<!-- 
  EditText.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-container v-if="prefKey" fluid class="path-container w-100">
    <PreferenceHeader v-if="title" :title="title" :tooltip="tooltip" @tooltipClick="emitTooltipClick" />
    <b-row no-gutters class="background w-100 d-flex">
      <b-row no-gutters class="mt-2 item w-100">
        <b-col
          v-for="(button, index) in value"
          :key="button.key"
          cols="auto"
          align-self="center"
          class="flex-grow-1 justify-content-start"
        >
          <b-button @click="onClick(index)" :id="`button-${packageName}-${button.key}`">{{ button.title }}</b-button>
        </b-col>
      </b-row>
    </b-row>
  </b-container>
</template>

<script lang="ts">
type ButtonValue = {
  key: string
  title: string
  lastClicked: number
}[]

import { Component, Prop } from 'vue-property-decorator'
import { Mixins } from 'vue-property-decorator'
import PreferenceHeader from './PreferenceHeader.vue'
import { ExtensionPreferenceMixin } from '../mixins/extensionPreferenceMixin'

@Component({
  components: {
    PreferenceHeader
  }
})
export default class ButtonGroup extends Mixins(ExtensionPreferenceMixin) {
  @Prop()
  private title!: string

  @Prop()
  private tooltip!: string

  private emitTooltipClick() {
    this.$emit('tooltipClick')
  }

  private onClick(index: number) {
    ;(this.value as ButtonValue)[index].lastClicked = Date.now()
    this.onInputChange()
  }
}
</script>

<style lang="sass" scoped>
.title
  font-size: 26px

.background
  align-content: flex-start
  background-color: transparent
  overflow: hidden

.progress-bar
  background-color: var(--accent)

.progress-container
  font-size: 16px
  height: 1.3rem !important
  background-color: var(--tertiary)
</style>
