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
          <svg
            @click="openFileBrowser"
            width="26"
            height="20"
            viewBox="0 0 26 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M24.96 3.4878H13.2925L9.48025 0.0670731C9.43174 0.0244748 9.36794 0.000534441 9.3015 0H1.04C0.46475 0 0 0.435976 0 0.97561V19.0244C0 19.564 0.46475 20 1.04 20H24.96C25.5352 20 26 19.564 26 19.0244V4.46341C26 3.92378 25.5352 3.4878 24.96 3.4878Z"
              fill="white"
            />
          </svg>
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

@Component({
  components: { PreferenceHeader }
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
