<!-- 
  FilePicker.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-container fluid class="path-container w-100">
    <PreferenceHeader v-if="title" :title="title" :tooltip="tooltip" />
    <b-row no-gutters class="background w-100 mt-2 d-flex">
      <b-row no-gutters class="mt-3 item w-100">
        <b-col cols="auto" align-self="center" class="ml-4 folder-icon">
          <FolderIcon @click.native="openFileBrowser" />
        </b-col>
        <b-col cols="auto" align-self="center" class="ml-3 justify-content-start">
          <div class="item-text text-truncate">{{ value }}</div>
        </b-col>
      </b-row>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import PreferenceHeader from './PreferenceHeader.vue'
import { ExtensionPreferenceMixin } from '../mixins/extensionPreferenceMixin'
import FolderIcon from '@/icons/FolderIcon.vue'

@Component({
  components: { PreferenceHeader, FolderIcon }
})
export default class FilePicker extends Mixins(ExtensionPreferenceMixin) {
  @Prop()
  private title!: string

  @Prop()
  private tooltip!: string

  private openFileBrowser() {
    window.WindowUtils.openFileBrowser(false, false).then((data) => {
      if (!data.canceled && data.filePaths.length > 0) {
        this.value = data.filePaths[0]
        this.onInputChange()
      }
    })
  }
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
</style>
