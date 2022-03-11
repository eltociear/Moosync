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
          <DirectoryGroup
            title="Song Directories"
            tooltip="Directories where all your local music is stored"
            :defaultValue="[]"
            prefKey="musicPaths"
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
  private forceRescan() {
    window.FileUtils.scan()
  }
}
</script>

<style lang="sass" scoped>
.path-selector
  max-width: 750px

.title
  text-align: left
</style>
