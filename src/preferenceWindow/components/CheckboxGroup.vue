<!-- 
  CheckboxGroup.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-container fluid class="path-container w-100" v-if="prefKey && Array.isArray(value)">
    <PreferenceHeader v-if="title" :title="title" :tooltip="tooltip" />
    <b-row no-gutters class="item w-100" v-for="(checkbox, index) in defaultValue" :key="checkbox.key">
      <b-col cols="auto" align-self="center">
        <b-checkbox
          @change="toggleCheck(index)"
          :id="`checkbox-${packageName}-${checkbox.key}`"
          :checked="getCheckboxEnabled(checkbox.key)"
        />
      </b-col>
      <b-col col md="8" lg="9" align-self="center" class="ml-3 justify-content-start">
        <div class="item-text text-truncate">{{ checkbox.title }}</div>
      </b-col>
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
export default class CheckboxGroup extends Mixins(ExtensionPreferenceMixin) {
  @Prop()
  private title!: string

  @Prop()
  private tooltip!: string

  private toggleCheck(index: number) {
    ;(this.value as CheckboxValue)[index].enabled = (
      document.getElementById(
        `checkbox-${this.packageName}-${(this.value as CheckboxValue)[index].key}`
      ) as HTMLInputElement
    ).checked
    this.onInputChange()
  }

  private getCheckboxEnabled(key: string) {
    return (this.value as { enabled: boolean; key: string }[]).find((val) => val.key === key)?.enabled ?? false
  }
}
</script>

<style lang="sass" scoped>
.title
  font-size: 26px

.background
  align-content: flex-start
  overflow-y: scroll
  overflow-x: hidden

.item
  height: 35px
  flex-wrap: nowrap

.item-text
  font-size: 18px
  color: var(--textPrimary)
  min-width: 0
  text-align: left
</style>
