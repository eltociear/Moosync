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
      <div id="musicbar-title" :title="title" class="text song-title text-truncate" @click="onTitleClick">
        {{ title }}
      </div>
      <div :title="artists ? artists.join(', ') : '-'" class="text song-subtitle text-truncate">
        {{ artists ? artists.join(', ') : '-' }}
      </div>
      <b-popover
        id="clipboard-popover"
        :show.sync="showPopover"
        target="musicbar-title"
        triggers="click blur"
        placement="top"
      >
        Copied!
      </b-popover>
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

  private showPopover: boolean = false

  private forceEmptyImg: boolean = false

  private onTitleClick() {
    let str = this.artists.join(', ')
    if (str) {
      str += ' - '
    }
    str += this.title
    navigator.clipboard.writeText(str)
    this.showPopover = true
    setTimeout(() => (this.showPopover = false), 1500)
  }

  private handleError() {
    this.forceEmptyImg = true
  }

  @Watch('imgSrc') onImgSrcChange() {
    this.forceEmptyImg = false
  }
}
</script>

<style lang="sass">
#clipboard-popover
  background: var(--accent)
  .arrow::after
    border-top-color: var(--accent)
  .popover-body
    color: var(--textInverse) !important
</style>

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
  width: fit-content
</style>
