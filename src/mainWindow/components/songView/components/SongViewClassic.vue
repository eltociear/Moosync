<!-- 
  SongViewClassic.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div class="w-100 h-100">
    <b-row align-v="center" class="details-background">
      <SongDetails
        class="details-container h-100"
        :defaultDetails="defaultDetails"
        :buttonGroup="detailsButtonGroup"
        :currentSong="currentSong"
        v-on="$listeners"
      />
    </b-row>
    <b-row class="list-container">
      <SongList
        :songList="songList"
        :extrafields="[
          { key: 'index', label: 'Sr. No' },
          { key: 'title', label: 'Title' },
          { key: 'album_name', label: 'Album' },
          { key: 'artist_name', label: 'Artists' }
        ]"
        :isLoading="isLoading"
        v-on="$listeners"
      />
    </b-row>
  </div>
</template>

<script lang="ts">
import { Component, Prop } from 'vue-property-decorator'
import { mixins } from 'vue-class-component'
import ImgLoader from '@/utils/ui/mixins/ImageLoader'
import SongList from './SongList.vue'
import SongDetails from './SongDetails.vue'
import ModelHelper from '@/utils/ui/mixins/ModelHelper'

@Component({
  components: {
    SongList,
    SongDetails
  }
})
export default class SongViewClassic extends mixins(ImgLoader, ModelHelper) {
  @Prop({ default: () => [] })
  private songList!: Song[]

  @Prop({ default: false })
  private currentSong!: Song | undefined | null

  @Prop({ default: false })
  private isLoading!: boolean

  @Prop({
    default: () => {
      return { defaultTitle: '', defaultSubtitle: '', defaultCover: '' }
    }
  })
  private defaultDetails!: SongDetailDefaults

  @Prop({
    default: () => {
      return {
        enableContainer: false,
        enableLibraryStore: false
      }
    }
  })
  private detailsButtonGroup!: SongDetailButtons
}
</script>

<style lang="sass" scoped>
.details-background
  height: 25%
  max-height: 200px
  margin-top: 15px
  width: calc(100% - 30px)
  border-radius: 28px
  background: var(--secondary)

.details-container
  width: 100%

.list-container
  height: 75%
</style>
