<!-- 
  MusicInfo.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div class="h-100 w-100">
    <div v-if="computedImg" class="dark-overlay" :style="{ top: !hasFrame ? '-28px' : '0px' }"></div>
    <transition
      name="custom-fade"
      enter-active-class="animate__animated animate__fadeIn"
      leave-active-class="animate__animated animate__fadeOut animate__faster"
    >
      <b-img
        class="bg-img"
        v-if="computedImg"
        :src="computedImg"
        :key="computedImg"
        referrerPolicy="no-referrer"
      ></b-img>
    </transition>

    <b-container fluid class="w-100 h-100 main-container">
      <b-row no-gutters align-h="end">
        <b-col cols="auto">
          <CrossIcon class="cross-icon button-grow" @click.native="close" />
        </b-col>
      </b-row>
      <b-row no-gutters align-h="center" class="h-100 flex-nowrap">
        <b-col cols="4">
          <SongDetailsCompact
            :cardHoverText="lyrics"
            :forceWhiteText="true"
            :currentSong="currentSong"
            :forceCover="computedImg"
            :isShowLyricsActive="showPlayer"
            @toggleLyrics="onToggleLyrics"
          />
          <div class="audioStream-slot" v-show="showPlayer === 2">
            <b-container fluid class="scrollable">
              <b-row no-gutters>
                <b-col class="position-relative">
                  <div class="video-container w-100">
                    <div class="embed-responsive embed-responsive-1by1">
                      <div class="embed-responsive-item">
                        <slot></slot>
                      </div>
                    </div>
                  </div>
                </b-col>
              </b-row>
            </b-container>
          </div>
        </b-col>
        <b-col offset="1" cols="7" class="right-container h-100">
          <div class="h-100" v-if="queueOrder.length > 0">
            <b-row>
              <b-col cols="auto" class="d-flex">
                <div class="rounded-btn" @click="saveAsPlaylist">Save as playlist</div>
                <div class="rounded-btn" @click="clear">Clear</div>
              </b-col>
            </b-row>
            <b-row class="queue-container-outer">
              <b-col class="h-100 queue-container mr-4">
                <draggable
                  class="h-100"
                  v-model="queueOrder"
                  ghost-class="ghost"
                  @start="drag = true"
                  @end="
                    () => {
                      drag = false
                      onDragEnd()
                    }
                  "
                  @change="handleIndexChange"
                >
                  <transition-group name="flip-list">
                    <QueueItem
                      v-for="(element, index) in queueOrder"
                      :key="element.id"
                      :id="`queue-item-${element.id}`"
                      :ref="`queue-item-${element.id}`"
                      :songID="element.songID"
                      :index="index"
                      :current="index === currentIndex"
                    />
                  </transition-group>
                </draggable>
              </b-col>
            </b-row>
          </div>
          <div v-else class="h-100 w-100 d-flex justify-content-center">
            <div class="align-self-center empty-message">Queue is empty...</div>
          </div>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script lang="ts">
import { mixins } from 'vue-class-component'
import { Component, Prop, Watch } from 'vue-property-decorator'
import SongDefault from '@/icons/SongDefaultIcon.vue'
import ImageLoader from '@/utils/ui/mixins/ImageLoader'
import ModelHelper from '@/utils/ui/mixins/ModelHelper'
import { vxm } from '@/mainWindow/store'
import { convertDuration } from '@/utils/common'
import QueueItem from '@/mainWindow/components/musicbar/components/QueueItem.vue'
import draggable from 'vuedraggable'
import { bus } from '@/mainWindow/main'
import { EventBus } from '@/utils/main/ipc/constants'
import SongDetailsCompact from '@/mainWindow/components/songView/components/SongDetailsCompact.vue'
import { PeerMode } from '@/mainWindow/store/syncState'
import CrossIcon from '@/icons/CrossIcon.vue'

@Component({
  components: {
    SongDefault,
    QueueItem,
    draggable,
    SongDetailsCompact,
    CrossIcon
  }
})
export default class MusicInfo extends mixins(ImageLoader, ModelHelper) {
  private hasFrame = false
  private ignoreScroll = false
  private lyrics = ''

  get queueProvider() {
    return vxm.sync.mode !== PeerMode.UNDEFINED ? vxm.sync : vxm.player
  }

  get remoteCover() {
    return vxm.sync.currentCover
  }

  get showPlayer() {
    return vxm.themes.showPlayer
  }

  private close() {
    bus.$emit('onToggleSlider', false)
  }

  private onDragEnd() {
    this.ignoreScroll = true
  }

  private scrollToActive() {
    if (this.ignoreScroll) {
      this.ignoreScroll = false
      return
    }

    const elem = this.$refs[`queue-item-${this.queueOrder[this.currentIndex]?.id}`]
    if (elem) {
      ;((elem as (Vue | Element)[])[0] as Vue).$el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      })
    }
  }

  async created() {
    this.hasFrame = await window.WindowUtils.hasFrame()
  }

  mounted() {
    this.scrollToActive()
  }

  private async getLyricsFromExtension() {
    if (this.currentSong) {
      const resp = await window.ExtensionUtils.sendEvent({
        type: 'requestedLyrics',
        data: [this.currentSong]
      })

      return resp && Object.values(resp).find((val) => !!val)
    }
  }

  @Watch('currentSong', { immediate: true })
  async onSongChange() {
    this.lyrics = ''
    if (this.currentSong) {
      if (this.currentSong.lyrics) {
        this.lyrics = this.currentSong.lyrics
      } else {
        this.lyrics = 'Searching Lyrics...'
        const resp =
          (await this.getLyricsFromExtension()) ??
          (await window.SearchUtils.searchLyrics(
            this.currentSong.artists?.map((val) => val.artist_name ?? '') ?? [],
            this.currentSong.title
          ))

        this.currentSong.lyrics = resp
        this.lyrics = resp || 'No lyrics found...'
        window.DBUtils.updateLyrics(this.currentSong._id, resp)
      }
    }
  }

  @Watch('currentIndex')
  async onIndexChange() {
    await this.$nextTick()
    this.scrollToActive()
  }

  get currentIndex() {
    return this.queueProvider.queueIndex
  }

  set queueOrder(value: { id: string; songID: string }[]) {
    this.queueProvider.setQueueOrder(value)
  }

  get queueOrder() {
    return this.queueProvider.queueOrder
  }

  private forceDefaultImg = false

  private handleError() {
    this.forceDefaultImg = true
  }

  get computedImg() {
    this.forceDefaultImg = false
    return this.remoteCover ?? this.getImgSrc(this.getValidImageHigh(this.currentSong))
  }

  private clear() {
    if (this.queueOrder.length > 0) {
      if (this.queueOrder.length === 1) {
        this.queueOrder = []
        this.queueProvider.queueIndex = -1
        vxm.player.playerState = 'STOPPED'
      } else {
        this.queueOrder = [this.queueOrder[this.currentIndex]]
        this.queueProvider.queueIndex = 0
      }
    }
  }

  private parseQueueItems(): Song[] {
    const songs = []
    for (const i of this.queueOrder) {
      songs.push(this.queueProvider.queueData[i.songID])
    }
    return songs
  }

  private saveAsPlaylist() {
    bus.$emit(EventBus.SHOW_NEW_PLAYLIST_MODAL, this.parseQueueItems())
  }

  private handleIndexChange(change: {
    moved: { element: { id: string; songID: string }; newIndex: number; oldIndex: number }
  }) {
    this.queueProvider.setSongIndex({
      oldIndex: change.moved.oldIndex,
      newIndex: change.moved.newIndex,
      ignoreMove: true
    })
  }

  @Prop({ default: () => null })
  private currentSong!: Song | null

  private formattedDuration = convertDuration

  private onToggleLyrics() {
    vxm.themes.showPlayer = vxm.themes.showPlayer === 1 ? 2 : 1
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
  padding-left: 72px
  overflow-y: scroll
  transition: color 0.3s ease
  color: transparent
  text-shadow: 0 0 white
  &:hover
    color: white

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
  padding-top: 60px
  padding-bottom: 30px

.queue-container
  overflow-y: scroll
  color: white !important

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

.dark-overlay
  height: calc(100% + 28px + 5px + 3px)
  width: 100vw
  z-index: -9998
  position: absolute
  left: 0
  background: rgba(0,0,0,.75)

.flip-list-move
  transition: transform 0.3s

.ghost
  opacity: 0.3

.rounded-btn
  background: var(--primary)
  border-radius: 17px
  padding: 8px 17px 8px 17px
  margin-right: 17px
  filter: drop-shadow(4px 4px 6px rgba(0, 0, 0, 0.28))

.queue-container-outer
  height: 95%
  padding: 12px !important

.empty-message
  margin-left: -30px
  font-size: 36px

.animate__animated.animate__fadeOut
  --animate-duration: 0.3s

.cross-icon
  width: 18px
  margin-right: 1.5rem

.audioStream-slot
  position: absolute
  left: 0
  top: 0
  width: 100%
  padding-right: 25px

.video-container
  position: relative
  text-shadow: 0 0 white
</style>
