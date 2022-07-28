<!-- 
  CheckboxGroup.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-container fluid class="path-container w-100" v-if="prefKey && Array.isArray(value)">
    <PreferenceHeader v-if="title" :title="title" :tooltip="tooltip" />
    <b-row no-gutters class="background w-100 mt-2 d-flex">
      <b-row no-gutters class="item w-100 h-100">
        <b-dropdown block :text="activeTitle" toggle-class="dropdown-button  h-100" class="w-100">
          <b-dropdown-item v-for="item in filteredDropdownList" :key="item.key" @click="setSelectedItem(item)"
            >{{ item.title }}
          </b-dropdown-item>
        </b-dropdown>
      </b-row>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Component, Prop, Mixins } from 'vue-property-decorator'
import { ExtensionPreferenceMixin } from '../mixins/extensionPreferenceMixin'
import PreferenceHeader from './PreferenceHeader.vue'
@Component({
  components: {
    PreferenceHeader
  }
})
export default class Dropdown extends Mixins(ExtensionPreferenceMixin) {
  @Prop()
  private title!: string

  @Prop()
  private tooltip!: string

  private activeItem: CheckboxValue[0] | null = null

  private get activeTitle() {
    return this.activeItem?.title ?? ''
  }

  private get filteredDropdownList() {
    return ((this.value as CheckboxValue) ?? this.defaultValue).filter((val) => !val.enabled)
  }

  created() {
    this.postFetch = () => {
      this.activeItem =
        (this.value as CheckboxValue)?.find((val) => val.enabled) ?? (this.defaultValue as CheckboxValue)[0]
    }
  }

  private setSelectedItem(item: CheckboxValue[0]) {
    for (const i of this.value as CheckboxValue) {
      if (i.key === item.key) {
        i.enabled = true
        this.activeItem = i
      } else {
        i.enabled = false
      }
    }
    this.onInputChange()
  }
}
</script>

<style lang="sass">
.dropdown-button
  background-color: var(--tertiary) !important
  border-radius: 0 !important
  border: none !important
  padding: 5px 35px 5px 15px
  text-align: start
  border-radius: 13px
  &:focus
    box-shadow: none !important
  &::after
    position: absolute
    right: 5px
    top: 50%
    transform: translate(-50%, -50%)
    margin-left: 10px

.dropdown > ul
  height: 500px
  overflow-y: auto
  overflow-x: hidden
  &::-webkit-scrollbar-track
    background: var(--secondary)
  &::-webkit-scrollbar-thumb
    color: var(--textPrimary)
</style>

<style lang="sass" scoped>
.item
  height: 35px
  flex-wrap: nowrap

.item-text
  font-size: 18px
  color: var(--textPrimary)
  min-width: 0
  text-align: left

.background
  background: var(--tertiary)
  height: 50px
</style>
