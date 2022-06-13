<!-- 
  QueueItem.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-container fluid class="item-container" @contextmenu="getItemContextMenu">
    <b-row class="item-row">
      <b-col cols="auto" class="img-container h-100 d-flex justify-content-start">
        <b-img
          class="h-100 image"
          v-if="!forceEmptyImg && image"
          :src="image"
          @error="handlerImageError(arguments[0], handlerError)"
          referrerPolicy="no-referrer"
        />
        <SongDefault v-else class="h-100 image" />
        <div @click="playSong" class="play-button d-flex justify-content-center">
          <Play2 class="align-self-center" />
        </div>
        <div v-if="current" class="now-playing d-flex justify-content-center">
          <AnimatedEqualizer class="animated-playing" />
        </div>
      </b-col>
      <b-col xl="8" lg="7" cols="5">
        <div class="d-flex">
          <div class="text-left song-title text-truncate">{{ song.title }}</div>
          <YoutubeIcon
            v-if="iconType === 'YOUTUBE'"
            :color="'#E62017'"
            :filled="true"
            :dropShadow="true"
            class="provider-icon"
          />
          <SpotifyIcon
            v-if="iconType === 'SPOTIFY'"
            :color="'#1ED760'"
            :filled="true"
            :dropShadow="true"
            class="provider-icon"
          />

          <inline-svg
            class="provider-icon"
            v-if="iconURL && iconType === 'URL' && iconURL.endsWith('svg')"
            :src="iconURL"
          />
          <img
            referrerPolicy="no-referrer"
            v-if="iconURL && iconType === 'URL' && !iconURL.endsWith('svg')"
            :src="iconURL"
            alt="provider icon"
            class="provider-icon"
          />
        </div>

        <div class="text-left song-subtitle text-truncate">
          {{ song.artists && song.artists.map((val) => val.artist_name).join(', ') }}
          {{ song.artists && song.artists.length > 0 && song.album && song.album.album_name ? ' - ' : '' }}
          {{ song.album && song.album.album_name }}
        </div>
      </b-col>
      <b-col cols="auto" class="text-right ml-auto d-flex align-items-center">
        <div class="ml-auto remove-button" @click="removeSong"><TrashIcon /></div>
      </b-col>
    </b-row>
    <!-- <div class="divider" /> -->
  </b-container>
</template>

<script lang="ts">
import { mixins } from 'vue-class-component'
import { Component, Prop } from 'vue-property-decorator'
import SongDefault from '@/icons/SongDefaultIcon.vue'
import { vxm } from '@/mainWindow/store'
import ImgLoader from '@/utils/ui/mixins/ImageLoader'
import Play2 from '@/icons/PlayIcon2.vue'
import PlayerControls from '@/utils/ui/mixins/PlayerControls'
import YoutubeIcon from '@/icons/YoutubeIcon.vue'
import SpotifyIcon from '@/icons/SpotifyIcon.vue'
import TrashIcon from '@/icons/TrashIcon.vue'

import AnimatedEqualizer from '@/icons/AnimatedEqualizerIcon.vue'

import ContextMenuMixin from '@/utils/ui/mixins/ContextMenuMixin'
import ErrorHandler from '@/utils/ui/mixins/errorHandler'

@Component({
  components: {
    SongDefault,
    Play2,
    YoutubeIcon,
    SpotifyIcon,
    AnimatedEqualizer,
    TrashIcon
  }
})
export default class MusicInfo extends mixins(ImgLoader, PlayerControls, ContextMenuMixin, ErrorHandler) {
  @Prop({ default: '' })
  private songID!: string

  @Prop({ default: false })
  private current!: boolean

  @Prop({ default: -1 })
  private index!: number

  private image: string | null = null

  private iconType = ''
  private iconURL = ''

  get queueProvider() {
    return this.isSyncing ? vxm.sync : vxm.player
  }

  private async getIconType() {
    this.iconURL = ''
    if (this.song.providerExtension) {
      const icon = await window.ExtensionUtils.getExtensionIcon(this.song.providerExtension)
      if (icon) {
        this.iconURL = 'media://' + icon
        return 'URL'
      }
    }

    return this.song.type
  }

  async created() {
    this.iconType = (await this.getIconType()) ?? ''
    if (this.isSyncing) {
      const tmp = await window.FileUtils.isImageExists(this.songID)
      if (tmp) this.image = 'media://' + tmp
    }
    if (!this.image) this.image = this.getImgSrc(this.getValidImageLow(this.song))
  }

  get song() {
    return this.queueProvider.queueData[this.songID]
  }

  private playSong() {
    this.playFromQueue(this.index)
  }

  private removeSong() {
    this.removeFromQueue(this.index)
  }

  private getItemContextMenu(event: Event) {
    this.getContextMenu(event, {
      type: 'QUEUE_ITEM',
      args: {
        isRemote: this.song.type === 'YOUTUBE' || this.song.type === 'SPOTIFY',
        song: this.song,
        songIndex: this.index,
        refreshCallback: () => this.removeSong()
      }
    })
  }

  private forceEmptyImg = false

  private handlerError() {
    this.forceEmptyImg = true
  }
}
</script>

<style lang="sass" scoped>
.item-container
  position: relative
  height: 87px

.image
  object-fit: cover
  width: 55px
  height: 55px
  border-radius: 10px

.song-title
  font-weight: 600
  font-size: 16px
  min-width: 0

.song-subtitle
  font-weight: 250
  font-size: 14px
  min-width: 0

.item-row
  height: 80px
  padding: 12px !important

.divider
  margin-top: 8px
  border-bottom: 1px solid var(--divider) !important
  width: 100%

.remove-button
  color: var(--accent)
  cursor: pointer
  padding: 10px
  svg
    width: 22px
    height: 22px

.play-button, .now-playing
  width: calc(80px - (12px * 2))
  height: calc(80px - (12px * 2))
  background: rgba(0, 0, 0, 0.6)
  position: absolute
  border-radius: 10px

.play-button
  opacity: 0
  transition: opacity 0.2s ease
  &:hover
    opacity: 1

.provider-icon
  align-self: center
  margin-left: 10px
  min-width: 20px
  min-width: 20px
  height: 20px
  width: 20px

.img-container
  min-width: calc(56px + 12px)

.text-content
  min-width: 0%

.animated-playing
  padding-top: 14px
  padding-bottom: 14px
</style>
