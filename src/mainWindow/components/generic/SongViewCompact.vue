<template>
  <b-row no-gutters class="h-100 compact-container">
    <b-col cols="8" class="h-100 song-list-compact">
      <SongListCompact :songList="songList" v-on="$listeners" />
    </b-col>
    <b-col cols="4" class="h-100">
      <SongDetailsCompact :defaultDetails="defaultDetails" :currentSong="currentSong" />
    </b-col>
  </b-row>
</template>

<script lang="ts">
import { Component, Prop } from 'vue-property-decorator'
import { mixins } from 'vue-class-component'
import PlayerControls from '@/utils/ui/mixins/PlayerControls'
import RemoteSong from '@/utils/ui/mixins/remoteSongMixin'
import ImgLoader from '@/utils/ui/mixins/ImageLoader'
import SongListCompact from './SongListCompact.vue'
import SongDetailsCompact from './SongDetailsCompact.vue'

@Component({
  components: {
    SongListCompact,
    SongDetailsCompact
  }
})
export default class SongViewCompact extends mixins(PlayerControls, RemoteSong, ImgLoader) {
  @Prop({ default: () => [] })
  private songList!: Song[]

  @Prop({ default: false })
  private currentSong!: Song | undefined | null

  @Prop({ default: false })
  private tableBusy!: boolean

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