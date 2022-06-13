<!-- 
  SongDetails.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-container fluid class="w-100">
    <b-row no-gutters class="d-flex h-100 main-container">
      <b-col class="h-100" cols="auto">
        <div class="h-100">
          <b-img
            @dragstart="dragFile"
            v-if="computedImg"
            class="image h-100"
            :src="computedImg"
            @error="handlerImageError(arguments[0], handleError)"
            referrerPolicy="no-referrer"
          />
          <SongDefault v-else class="h-100 image" />
        </div>
      </b-col>
      <b-col class="text-container text-truncate">
        <b-container fluid class="h-100 d-flex flex-column">
          <b-row no-gutters>
            <b-col cols="auto" :title="title" class="title text-truncate">
              {{ title }}
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
              <div :title="subtitle" class="subtitle text-truncate">
                {{ subtitle }}
              </div>
              <div :title="subSubTitle" class="subtitle text-truncate">
                {{ subSubTitle }}
              </div>
            </div>
          </b-row>
          <b-row no-gutters align-v="end" class="flex-fill mt-2">
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
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { mixins } from 'vue-class-component'
import { Component, Prop, Watch } from 'vue-property-decorator'
import SongDefault from '@/icons/SongDefaultIcon.vue'
import PlainPlay from '@/icons/PlainPlayIcon.vue'
import AddToLibrary from '@/icons/AddToLibraryIcon.vue'
import AddToQueue from '@/icons/AddToQueueIcon.vue'
import YoutubeIcon from '@/icons/YoutubeIcon.vue'
import SpotifyIcon from '@/icons/SpotifyIcon.vue'
import ErrorHandler from '@/utils/ui/mixins/errorHandler'
import ImageLoader from '@/utils/ui/mixins/ImageLoader'
import FileMixin from '@/utils/ui/mixins/FileMixin'
import { convertDuration } from '@/utils/common'

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
export default class SongDetails extends mixins(ImageLoader, ErrorHandler, FileMixin) {
  @Prop({ default: null })
  private currentSong!: Song | null | undefined

  private subtitle: string = this.getConcatedSubtitle()

  @Prop({ default: () => null })
  private defaultDetails!: SongDetailDefaults | null

  @Prop({ default: () => undefined })
  private forceCover!: string

  @Prop({
    default: () => {
      return {
        enableContainer: false,
        enableLibraryStore: false
      }
    }
  })
  private buttonGroup!: SongDetailButtons

  get computedImg() {
    return (
      this.forceCover ?? this.getImgSrc(this.getValidImageHigh(this.currentSong) ?? this.defaultDetails?.defaultCover)
    )
  }

  @Watch('defaultDetails')
  @Watch('currentSong')
  onSongchange() {
    this.subtitle = this.getConcatedSubtitle()
  }

  get subSubTitle() {
    return (
      (this.currentSong && convertDuration(this.currentSong.duration)) ?? this.defaultDetails?.defaultSubSubtitle ?? ''
    )
  }

  get title() {
    return this.currentSong?.title ?? this.defaultDetails?.defaultTitle ?? ''
  }

  get currentType() {
    return this.currentSong?.type
  }

  private isArtistAlbumNotEmpty() {
    return !!(this.currentSong?.artists && this.currentSong.artists.length > 0 && this.currentSong?.album?.album_name)
  }

  private getParsedSubtitle() {
    if (this.currentSong && (this.currentSong.artists?.length || this.currentSong.album?.album_name)) {
      return (
        ((this.currentSong?.artists && this.currentSong?.artists.map((val) => val.artist_name)?.join(', ')) ?? '') +
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
