<template>
  <div>
    <div class="card mb-2 card-grow" @contextmenu="emitContext">
      <div class="card-img-top">
        <div class="icon-container" :style="{ background: iconBgColor }">
          <slot name="icon" />
        </div>
        <div class="embed-responsive embed-responsive-1by1">
          <div class="embed-responsive-item img-container">
            <img
              v-if="imgSrc && !forceEmptyImg"
              :src="getImgSrc(imgSrc)"
              alt="Album Art"
              :class="[isOverlayExists ? 'overlay-base' : '']"
              class="img-fluid w-100 h-100"
              @error="handlerImageError(arguments[0], handleError)"
            />
            <div class="overlay me-auto justify-content-center d-flex align-items-center h-100 w-100">
              <slot name="overlay" />
            </div>
            <div class="default-icon" :class="[isOverlayExists ? 'overlay-base' : '']">
              <slot v-if="!imgSrc || forceEmptyImg" name="defaultCover" />
            </div>
          </div>
        </div>
      </div>
      <div class="card-body">
        <p class="title text-truncate" :title="title">{{ title }}</p>
        <p v-if="subtitle" class="subtitle text-truncate" :title="subtitle">{{ subtitle }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import ImageLoader from '@/utils/ui/mixins/ImageLoader'
import { mixins } from 'vue-class-component'
import { Component, Prop, Watch } from 'vue-property-decorator'
import ErrorHandler from '@/utils/ui/mixins/errorHandler'
import Play2 from '@/icons/Play2.vue'

@Component({
  components: {
    Play2
  }
})
export default class CardView extends mixins(ImageLoader, ErrorHandler) {
  @Prop({ default: '' })
  private title!: string

  @Prop({ default: '' })
  private subtitle!: string

  @Prop({ default: '' })
  private id!: string

  @Prop({ default: '' })
  private imgSrc!: string

  @Prop({ default: 'transparent' })
  private iconBgColor!: string

  private forceEmptyImg: boolean = false

  private get isOverlayExists(): boolean {
    return !!this.$slots.overlay
  }

  @Watch('imgSrc') onImgSrcChange() {
    this.forceEmptyImg = false
  }

  private handleError() {
    this.forceEmptyImg = true
  }

  private emitContext(event: Event) {
    event.stopPropagation()
    this.$emit('CardContextMenu', event)
  }
}
</script>

<style lang="sass">
.card
  background-color: transparent
  border: none
  text-align: left
  padding-left: 0
  padding-right: 0
  max-width: 200px

.title
  margin-bottom: 0 !important
  font-weight: 300
  font-size: 20px

.subtitle
  margin-bottom: 0 !important
  font-size: 16px

.default-icon
  svg
    border-radius: 16px

img
  mix-blend-mode: normal
  border-radius: 16px
  height: 100%
  width: 100%
  object-fit: cover

.card
  background-color: transparent

.card-body
  padding: 12px

.icon-container
  z-index: 1
  position: absolute
  top: 16px
  left: 0px
  padding-left: 10px
  svg
    width: 24px
    height: 24px

.overlay
  position: absolute
  top: 0
  opacity: 0

.img-container
  position: relative
  &:hover
    .overlay-base
      opacity: 0.2
    .overlay
      opacity: 1
</style>
