<!-- 
  EditText.vue is a part of Moosync.
  
  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-container v-if="prefKey" fluid class="path-container w-100">
    <PreferenceHeader v-if="title" :title="title" :tooltip="tooltip" />
    <b-row no-gutters class="background w-100 mt-2 d-flex">
      <b-row no-gutters class="mt-3 item w-100">
        <b-col cols="auto" align-self="center" class="ml-4 folder-icon"> </b-col>
        <b-col cols="auto" align-self="center" class="flex-grow-1 justify-content-start">
          <b-input v-model="value" id="ext-input" class="ext-input" debounce="500" @update="onInputChange" />
        </b-col>
        <b-col cols="auto" class="mr-4"></b-col>
      </b-row>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import { Mixins } from 'vue-property-decorator'
import PreferenceHeader from './PreferenceHeader.vue'
import { ExtensionPreferenceMixin } from '../mixins/extensionPreferenceMixin'

@Component({
  components: {
    PreferenceHeader
  }
})
export default class EditText extends Mixins(ExtensionPreferenceMixin) {
  @Prop()
  private title!: string

  @Prop()
  private tooltip!: string
}
</script>

<style lang="sass" scoped>
.title
  font-size: 26px

.background
  align-content: flex-start
  background-color: var(--tertiary)
  height: 65px
  overflow: hidden

.item
  height: 35px
  flex-wrap: nowrap

.item-text
  font-size: 18px
  color: var(--textSecondary)
  min-width: 0
  text-align: left

.folder-icon
  &:hover
    cursor: pointer

.ext-input
  font-size: 16px
  max-width: 100%
  margin-bottom: 15px !important
  color: var(--textPrimary)
  background-color: transparent
  border: 0
  border-bottom: 1px solid transparent
  border-radius: 0
  padding: 0
  &:hover
    border-bottom: 1px solid var(--accent)
  &:focus
    border-bottom: 1px solid var(--accent)
    outline: none
    -webkit-box-shadow: none
</style>
