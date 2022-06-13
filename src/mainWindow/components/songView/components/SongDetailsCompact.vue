<!-- 
  SongDetailsCompact.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-container fluid class="h-100 scrollable">
    <b-row no-gutters>
      <b-col class="position-relative">
        <div class="image-container w-100">
          <div class="embed-responsive embed-responsive-1by1">
            <div class="embed-responsive-item">
              <transition
                name="custom-fade"
                enter-active-class="animate__animated animate__fadeIn"
                leave-active-class="animate__animated animate__fadeOut animate__faster"
              >
                <b-img
                  @dragstart="dragFile"
                  class="h-100 w-100 albumart"
                  v-if="computedImg"
                  :src="computedImg"
                  :key="computedImg"
                  @error="handleImageError"
                  referrerPolicy="no-referrer"
                />
                <SongDefault class="albumart w-100" v-if="!computedImg" />
              </transition>

              <div v-if="cardHoverText" :class="`hoverText ${pinHoverText ? 'visible-always' : ''}`">
                <PinIcon
                  :filled="pinHoverText"
                  @click.native="pinHoverText = !pinHoverText"
                  class="pin-icon button-grow"
                />
                <div class="black-overlay"></div>
                <div v-html="parsedCardHoverText"></div>
              </div>
            </div>
          </div>

          <div class="song-info-container" :style="{ color: `${forceWhiteText ? '#fff' : 'var(--textPrimary)'}` }">
            <div class="d-flex">
              <div class="song-title text-truncate">
                {{ title }}
              </div>
            </div>
            <div class="song-subtitle text-truncate" :title="subtitle" v-if="subtitle">{{ subtitle }}</div>
            <div class="song-timestamp" :title="subSubTitle" v-if="subSubTitle">
              {{ subSubTitle }}
            </div>
          </div>
        </div>
      </b-col>
    </b-row>
    <b-row no-gutters class="flex-fill mt-2">
      <b-col>
        <div v-if="buttonGroup.enableContainer" class="button-group d-flex">
          <PlainPlay :title="`Play ${title}`" @click.native="playAll" />
          <AddToQueue :title="`Add ${title} to queue`" @click.native="addToQueue" />
          <AddToLibrary
            :title="`Add ${title} to library`"
            @click.native="addToLibrary"
            v-if="buttonGroup.enableLibraryStore"
          />
        </div>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import ImgLoader from '@/utils/ui/mixins/ImageLoader'
import FileMixin from '@/utils/ui/mixins/FileMixin'

import Component, { mixins } from 'vue-class-component'
import { Prop, Watch } from 'vue-property-decorator'
import SongDefault from '@/icons/SongDefaultIcon.vue'
import { convertDuration } from '@/utils/common'
import PlainPlay from '@/icons/PlainPlayIcon.vue'
import AddToLibrary from '@/icons/AddToLibraryIcon.vue'
import AddToQueue from '@/icons/AddToQueueIcon.vue'
import PinIcon from '@/icons/PinIcon.vue'

@Component({
  components: {
    SongDefault,
    PlainPlay,
    AddToLibrary,
    AddToQueue,
    PinIcon
  }
})
export default class SongDetailsCompact extends mixins(ImgLoader, FileMixin) {
  @Prop({ default: null })
  private currentSong!: Song | null | undefined

  private subtitle: string = this.getConcatedSubtitle()

  @Prop({ default: () => null })
  private defaultDetails!: SongDetailDefaults | null

  @Prop({ default: () => undefined })
  private forceCover!: string

  private forceShowDefaultImage = false

  private pinHoverText = false

  @Prop({
    default: () => {
      return {
        enableContainer: false,
        enableLibraryStore: false
      }
    }
  })
  private buttonGroup!: SongDetailButtons

  @Prop({ default: false })
  private forceWhiteText!: boolean

  @Prop({ default: '' })
  private cardHoverText!: string
  private parsedCardHoverText = ''

  private handleImageError() {
    this.forceShowDefaultImage = true
  }

  get computedImg() {
    if (!this.forceShowDefaultImage) {
      return (
        this.forceCover ?? this.getImgSrc(this.getValidImageHigh(this.currentSong) ?? this.defaultDetails?.defaultCover)
      )
    }
    return undefined
  }

  @Watch('cardHoverText', { immediate: true })
  private onCardHoverTextChange() {
    this.parsedCardHoverText = this.cardHoverText.replaceAll('\n', '</br>')
  }

  @Watch('defaultDetails')
  @Watch('currentSong')
  onSongchange() {
    this.subtitle = this.getConcatedSubtitle()
    this.forceShowDefaultImage = false
  }

  get subSubTitle() {
    return (
      (this.currentSong && convertDuration(this.currentSong.duration)) ?? this.defaultDetails?.defaultSubSubtitle ?? ''
    )
  }

  get title() {
    return this.currentSong?.title ?? this.defaultDetails?.defaultTitle ?? ''
  }

  private isArtistAlbumNotEmpty() {
    return !!(this.currentSong?.artists && this.currentSong.artists.length > 0 && this.currentSong?.album?.album_name)
  }

  private getParsedSubtitle() {
    if (this.currentSong && (this.currentSong.artists?.length || this.currentSong.album?.album_name)) {
      return (
        ((this.currentSong?.artists && this.currentSong?.artists?.map((val) => val.artist_name).join(', ')) ?? '') +
        (this.isArtistAlbumNotEmpty() ? ' - ' : '') +
        ((this.currentSong?.album && this.currentSong.album.album_name) ?? '')
      )
    }
  }

  private getConcatedSubtitle() {
    return this.getParsedSubtitle() ?? this.defaultDetails?.defaultSubtitle ?? ''
  }

  private playAll() {
    this.$emit('playAll')
  }

  private addToQueue() {
    this.$emit('addToQueue')
  }

  private addToLibrary() {
    this.$emit('addToLibrary')
  }
}
</script>

<style lang="sass" scoped>
.albumart
  border-radius: 28px
  -webkit-user-select: none
  user-select: none
  object-fit: cover

.image-container
  position: relative
  text-shadow: 0 0 white

.song-info-container
  text-align: left
  margin-top: 15px
  .song-title
    font-weight: bold
    font-size: 24px
  .song-subtitle
    font-weight: 250
    font-size: 18px
  .song-timestamp
    font-weight: 600
    font-size: 16px

.main-container
  position: absolute
  left: 0
  top: 0
  padding-top: 72px
  padding-bottom: 30px

.queue-container
  overflow-y: scroll

.right-container
  margin-left: 5rem

.bg-img
  height: 100vh
  width: 100vw
  object-fit: cover
  filter: blur(10px)
  position: absolute
  top: 0
  left: 0
  z-index: -9999

.animate__animated.animate__fadeOut
  --animate-duration: 0.3s

.scrollable
  overflow-y: scroll
  color: transparent
  transition: color 0.3s ease
  &:hover
    color: white

.hoverText
  position: absolute
  color: white
  width: 100%
  height: 100%
  top: 0
  left: 0
  border-radius: 28px
  opacity: 0
  overflow-y: overlay
  transition: opacity 0.2s ease-in-out
  text-align: left
  padding: 30px 25px 30px 25px
  background: rgba(0, 0, 0, 0.7)
  line-height: 1.5
  pre
    color: white
    font-family: 'Nunito Sans'
    font-size: 18px
    font-weight: normal
    white-space: pre-wrap
  &:hover
    opacity: 1
    backdrop-filter: blur(5px)

.hoverText.visible-always
  opacity: 1
  backdrop-filter: blur(5px)

.pin-icon
  position: absolute
  top: 0
  right: 30px
  width: 25px
</style>
