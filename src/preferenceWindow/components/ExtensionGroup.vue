<!-- 
  ExtensionGroup.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-container fluid class="path-container w-100">
    <b-row no-gutters>
      <PreferenceHeader title="Extensions" tooltip="List of all installed extensions" />
      <b-col cols="auto" align-self="center" class="new-directories ml-auto">
        <div class="add-directories-button" @click="openFileBrowser">Install Extension</div>
      </b-col>
    </b-row>
    <b-row no-gutters class="background w-100 mt-2 d-flex" v-if="Array.isArray(extensions)">
      <b-row no-gutters class="mt-3 item w-100" v-for="(ext, index) in extensions" :key="ext.packageName">
        <b-col cols="auto" align-self="center" class="ml-4">
          <b-checkbox @change="togglePath(index)" :id="`ext-${index}`" :checked="ext.hasStarted" />
        </b-col>
        <b-col col md="8" lg="9" align-self="center" class="ml-3 justify-content-start">
          <div class="item-text text-truncate">{{ ext.name }} - {{ ext.version }}</div>
          <div class="item-text-subtitle text-truncate">{{ ext.author }}</div>
        </b-col>
        <b-col cols="auto" align-self="center" class="ml-auto">
          <div class="remove-button w-100" @click="removePath(index)">Remove</div>
        </b-col>
      </b-row>
    </b-row>
    <DeleteModal
      v-if="extensions[extensionInAction]"
      id="extensionDeleteModal"
      :itemName="extensions[extensionInAction].name"
      @confirm="removeExtension"
    />
  </b-container>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import DeleteModal from '../../commonComponents/ConfirmationModal.vue'
import PreferenceHeader from './PreferenceHeader.vue'
@Component({
  components: {
    DeleteModal,
    PreferenceHeader
  }
})
export default class ExtensionGroup extends Vue {
  @Prop({ default: () => [] })
  private extensions!: ExtensionDetails[]

  private extensionInAction = 0

  private togglePath(index: number) {
    if (index >= 0) {
      const ext = this.extensions[index]
      const status = (document.getElementById(`ext-${index}`) as HTMLInputElement).checked
      window.ExtensionUtils.toggleExtStatus(ext.packageName, status).then(() => (ext.hasStarted = status))
    }
  }

  private removeExtension() {
    if (this.extensions[this.extensionInAction]) {
      window.ExtensionUtils.uninstall(this.extensions[this.extensionInAction].packageName).then(() =>
        this.$emit('extensionsChanged')
      )
    }
  }

  private removePath(index: number) {
    if (index >= 0) {
      this.extensionInAction = index
      this.$bvModal.show('extensionDeleteModal')
      // window.ExtensionUtils.uninstall(this.extensions[index].packageName).then(() => this.$emit('extensionsChanged'))
    }
  }

  private openFileBrowser() {
    window.WindowUtils.openFileBrowser(false, true, [{ name: 'Moosync Extension File', extensions: ['msox'] }]).then(
      (data) => {
        if (!data.canceled) {
          window.ExtensionUtils.install(...data.filePaths).then(() => this.$emit('extensionsChanged'))
        }
      }
    )
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
// .container
//   max-width: 720px
.title
  font-size: 20px

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
  color: var(--textPrimary)
  min-width: 0
  text-align: left

.item-text-subtitle
  font-size: 14px
  color: var(--textSecondary)
  min-width: 0
  text-align: left

.remove-button
  color: #E62017
  user-select: none
  &:hover
    cursor: pointer
</style>
