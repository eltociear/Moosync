<template>
  <b-container fluid class="path-container w-100">
    <b-row no-gutters v-if="title">
      <PreferenceHeader v-if="title" :title="title" :tooltip="tooltip" />
      <b-col cols="auto" align-self="center" class="new-directories ml-auto">
        <div class="add-directories-button" @click="openFileBrowser">Add New Directory...</div>
      </b-col>
    </b-row>
    <b-row no-gutters class="background w-100 mt-2 d-flex" v-if="Array.isArray(value)">
      <b-row no-gutters class="mt-3 item w-100" v-for="(path, index) in value" :key="path.path">
        <b-col cols="auto" align-self="center" class="ml-4">
          <b-checkbox @change="togglePath(index)" :id="`path-${packageName}-${path.path}`" :checked="path.enabled" />
        </b-col>
        <b-col col md="8" lg="9" align-self="center" class="ml-3 justify-content-start">
          <div class="item-text text-truncate">{{ path.path }}</div>
        </b-col>
        <b-col cols="auto" align-self="center" class="ml-auto">
          <div class="remove-button w-100" @click="removePath(index)">Remove</div>
        </b-col>
      </b-row>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Component, Prop, Vue, Mixins } from 'vue-property-decorator'
import Tooltip from '@/commonComponents/Tooltip.vue'
import { ExtensionPreferenceMixin } from '../mixins/extensionPreferenceMixin'
import PreferenceHeader from './PreferenceHeader.vue'
@Component({
  components: {
    Tooltip,
    PreferenceHeader
  }
})
export default class DirectoryGroup extends Mixins(ExtensionPreferenceMixin) {
  @Prop()
  private title!: string

  @Prop()
  private tooltip!: string

  private togglePath(index: number) {
    if (index >= 0) {
      const path = this.value[index]
      this.value[index].enabled = (
        document.getElementById(`path-${this.packageName}-${path.path}`) as HTMLInputElement
      ).checked
      this.onInputChange()
    }
  }

  private removePath(index: number) {
    if (index >= 0) {
      this.value.splice(index, 1)
      this.onInputChange()
    }
  }

  private openFileBrowser() {
    window.WindowUtils.openFileBrowser(false).then((data) => {
      if (!data.canceled) {
        for (const path of data.filePaths) {
          this.value.push({ path, enabled: true })
        }
        this.onInputChange()
      }
    })
  }
}
</script>

<style lang="sass">
.custom-control-input:checked + .custom-control-label::before
  background-color: transparent
  border-color: white

.custom-control-input:indeterminate ~ .custom-control-label
  background-image: none
  box-shadow: none

.custom-control-input:focus ~ .custom-control-label::before
  outline: white !important
  border: 1px solid white !important
  box-shadow: 0 0 1px 1px #fff

.custom-control-label
  &::before
    background-color: transparent
</style>

<style lang="sass" scoped>
.new-directories
  font-size: 16px
  color: var(--accent)
  &:hover
    cursor: pointer

.add-directories-button
  user-select: none

.background
  align-content: flex-start
  background-color: var(--tertiary)
  height: 220px
  overflow-y: scroll
  overflow-x: hidden

  &::-webkit-scrollbar-track
    background: var(--tertiary)

.item
  height: 35px
  flex-wrap: nowrap

.item-text
  font-size: 18px
  color: var(--textSecondary)
  min-width: 0
  text-align: left

.remove-button
  color: #E62017
  user-select: none
  &:hover
    cursor: pointer
</style>
