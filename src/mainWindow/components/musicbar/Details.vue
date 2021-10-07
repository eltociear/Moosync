<template>
  <div class="d-flex w-100">
    <b-img
      fluid
      ref="cover"
      class="coverimg"
      v-if="imgSrc && !forceEmptyImg"
      :src="imgSrc"
      alt="cover art"
      @error="handlerImageError(arguments[0], handleError)"
    />
    <SongDefault v-if="!imgSrc || forceEmptyImg" class="coverimg" />
    <div class="text-container">
      <div :title="title" class="text song-title text-truncate">
        {{ title }}
      </div>
      <div :title="artists ? artists.join(', ') : '-'" class="text song-subtitle text-truncate">
        {{ artists ? artists.join(', ') : '-' }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { mixins } from 'vue-class-component'
import { Component, Prop, Watch } from 'vue-property-decorator'
import SongDefault from '@/icons/SongDefault.vue'
import ImageLoader from '@/utils/ui/mixins/ImageLoader'
import ErrorHandler from '@/utils/ui/mixins/errorHandler'

@Component({
  components: {
    SongDefault
  }
})
export default class MusicBar extends mixins(ImageLoader, ErrorHandler) {
  @Prop({ default: '-' })
  title!: string

  @Prop({ default: () => [] })
  artists!: string[]

  @Prop({ default: '' })
  private imgSrc!: string

  private forceEmptyImg: boolean = false

  private handleError() {
    this.forceEmptyImg = true
  }

  @Watch('imgSrc') onImgSrcChange() {
    this.forceEmptyImg = false
  }
}
</script>

<style lang="sass" scoped>

.coverimg
  height: 56px
  width: 56px
  min-width: 56px
  margin-right: 15px
  border-radius: 10px
  object-fit: cover

.text
  text-align: left
  font-weight: normal
  line-height: 170.19%

.song-title
  font-size: 19.1549px

.song-subtitle
  font-size: 12.2592px
  color: var(--textSecondary)

.text-container
  width: calc( 100% - 56px - 15px )
</style>
