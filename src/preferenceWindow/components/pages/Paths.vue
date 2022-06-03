<!-- 
  Paths.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div class="w-100 h-100">
    <b-container fluid>
      <b-row no-gutters class="w-100">
        <div class="path-selector w-100">
          <b-container fluid>
            <b-row v-if="!isLibvipsAvailable">
              <b-col class="lib-missing"
                >*Sharp was unable to load (Missing libvips-cpp.so or libffi.so.7 probably). Images will not be
                optimised. Read more at
                <span class="lib-missing-link" @click="openWiki">https://moosync.app/wiki/#known-bugs</span></b-col
              >
            </b-row>

            <b-row no-gutters v-if="totalValue != 0">
              <b-col>
                <b-progress class="progress-container mb-4" :max="totalValue">
                  <b-progress-bar class="progress-bar" :value="currentValue" animated />
                </b-progress>
              </b-col>
              <b-col cols="auto" class="ml-3"> {{ ((currentValue / totalValue) * 100).toPrecision(2) }}% </b-col>
            </b-row>
          </b-container>

          <DirectoryGroup
            title="Song Directories"
            tooltip="Directories where all your local music is stored"
            :defaultValue="[]"
            prefKey="musicPaths"
            @refresh="forceRescan"
          />
          <FilePicker
            title="Downloaded Artwork Path"
            tooltip="Directory where downloaded artworks are stored"
            prefKey="artworkPath"
            class="mt-5"
          />
          <FilePicker
            title="Generated Thumbnail Path"
            tooltip="Directory where generated thumbnails are stored"
            prefKey="thumbnailPath"
            class="mt-5"
          />
        </div>
      </b-row>
    </b-container>
  </div>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator'
import Vue from 'vue'
import FilePicker from '../FilePicker.vue'
import DirectoryGroup from '../DirectoryGroup.vue'

@Component({
  components: {
    DirectoryGroup,
    FilePicker
  }
})
export default class Paths extends Vue {
  private currentValue = 0
  private totalValue = 0

  private isLibvipsAvailable = true

  private forceRescan() {
    window.FileUtils.scan()
  }

  private setProgress(progress: Progress) {
    this.currentValue = progress.current
    this.totalValue = progress.total
  }

  private openWiki() {
    window.WindowUtils.openExternal('https://moosync.app/wiki/#known-bugs')
  }

  async created() {
    this.setProgress(await window.FileUtils.getScanProgress())
    window.FileUtils.listenScanProgress(async (progress) => {
      this.setProgress(progress)
    })

    this.isLibvipsAvailable = await window.NotifierUtils.isLibvipsAvailable()
  }
}
</script>

<style lang="sass" scoped>
.path-selector
  max-width: 750px

.title
  text-align: left

.progress-bar
  background-color: var(--accent)

.progress-container
  font-size: 16px
  height: 1.3rem !important
  background-color: var(--tertiary)

.lib-missing
  text-align: left
  margin-bottom: 15px
  color: #E62017

.lib-missing-link
  cursor: pointer
  &:hover
    text-decoration: underline
</style>
