<!-- 
  SongDetails.vue is a part of Moosync.
  
  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-container fluid class="w-100">
    <b-row no-gutters class="d-flex h-100 main-container">
      <b-col class="h-100" cols="auto">
        <div class="h-100">
          <b-img
            v-if="(getImgSrc(imgSrc) || getImgSrc(defaultImgSrc)) && !forceEmptyImg"
            class="image h-100"
            :src="getImgSrc(imgSrc) ? getImgSrc(imgSrc) : getImgSrc(defaultImgSrc)"
            @error="handlerImageError(arguments[0], handleError)"
          />
          <SongDefault v-else class="h-100 image" />
        </div>
      </b-col>
      <b-col class="text-container text-truncate">
        <b-container fluid class="h-100 d-flex flex-column">
          <b-row no-gutters>
            <b-col :title="currentTitle ? currentTitle : defaultTitle" class="title text-truncate">
              {{ currentTitle ? currentTitle : defaultTitle }}
            </b-col>
            <b-col cols="auto" align-self="center">
              <YoutubeIcon
                v-if="currentType === 'YOUTUBE'"
                :color="'#E62017'"
                :filled="true"
                :dropShadow="true"
                class="ml-2 align-self-center provider-icon"
              />
              <SpotifyIcon
                v-if="currentType === 'SPOTIFY'"
                :color="'#07C330'"
                :filled="true"
                :dropShadow="true"
                class="ml-2 align-self-center provider-icon"
              />
            </b-col>
          </b-row>

          <b-row no-gutters>
            <div>
              <div :title="currentsubTitle ? currentsubTitle : defaultsubTitle" class="subtitle text-truncate">
                {{ currentsubTitle ? currentsubTitle : defaultsubTitle }}
              </div>
              <div :title="currentSubSubTitle ? currentSubSubTitle : ''" class="subtitle text-truncate">
                {{ currentSubSubTitle ? currentSubSubTitle : '' }}
              </div>
            </div>
          </b-row>
          <b-row no-gutters align-v="end" class="flex-fill mt-2">
            <b-col>
              <div v-if="buttonGroup.enableContainer" class="button-group d-flex">
                <PlainPlay :title="`Play ${currentTitle ? currentTitle : defaultTitle}`" @click.native="playAll" />
                <AddToQueue
                  :title="`Add ${currentTitle ? currentTitle : defaultTitle} to queue`"
                  @click.native="addToQueue"
                />
                <AddToLibrary
                  :title="`Add ${currentTitle ? currentTitle : defaultTitle} to library`"
                  @click.native="addToLibrary"
                  v-if="buttonGroup.enableLibraryStore"
                />
              </div>
            </b-col>
          </b-row>
        </b-container>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { mixins } from 'vue-class-component'
import { Component, Prop, Ref, Watch } from 'vue-property-decorator'
import SongDefault from '@/icons/SongDefault.vue'
import PlainPlay from '@/icons/PlainPlay.vue'
import AddToLibrary from '@/icons/AddToLibrary.vue'
import AddToQueue from '@/icons/AddToQueue.vue'
import YoutubeIcon from '@/icons/Youtube.vue'
import SpotifyIcon from '@/icons/Spotify.vue'
import ErrorHandler from '@/utils/ui/mixins/errorHandler'
import ImageLoader from '@/utils/ui/mixins/ImageLoader'

@Component({
  components: {
    SongDefault,
    PlainPlay,
    AddToLibrary,
    AddToQueue,
    YoutubeIcon,
    SpotifyIcon
  }
})
export default class SongDetails extends mixins(ImageLoader, ErrorHandler) {
  @Prop({ default: '' })
  private currentTitle!: string

  @Prop({ default: '' })
  private currentsubTitle!: string

  @Prop({ default: '' })
  private currentSubSubTitle!: string

  @Prop({ default: '' })
  private imgSrc!: string

  @Prop({ default: 'LOCAL' })
  private currentType!: string

  @Prop({ default: '' })
  private defaultTitle!: string

  @Prop({ default: '' })
  private defaultsubTitle!: string

  @Prop({ default: '' })
  private defaultImgSrc!: string

  @Prop({
    default: () => {
      return {
        enableContainer: false,
        enableLibraryStore: false
      }
    }
  })
  private buttonGroup!: SongDetailButtons

  private handleError() {
    this.forceEmptyImg = true
  }

  @Watch('imgSrc') onImgSrcChange() {
    this.forceEmptyImg = false
  }

  public forceEmptyImg: boolean = false

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

<style lang="sass">
@import "~bootstrap/scss/mixins"

.image
  border-radius: 25px
  object-fit: cover
  aspect-ratio: 1 / 1

.text-container > .b-overlay > .bg-dark
  background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.58), rgba(0, 0, 0, 0.58)), radial-gradient(50% 50% at 50% 50%, rgba(255, 255, 255, 0) 0%, rgba(0, 0, 0, 0.2) 100%) !important
  background-color: #00000000 !important

.text-over
  text-align: left
  margin-left: 15px

.text-container
  margin-left: 15px
  overflow: hidden

.title
  font-size: 24px
  text-align: left
  max-width: fit-content

.dummy
  margin-top: 75%

.subtitle
  font-weight: 250
  text-align: left
  font-size: 14px

.button-group
  @media (max-height: 700px)
    display: none !important
  svg
    margin-right: 16px

.provider-icon
  height: 20px
  width: 20px

.main-container
  padding-top: 15px
  padding-bottom: 15px
</style>
