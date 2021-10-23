<template>
  <div>
    <div v-if="computedImg" class="dark-overlay"></div>
    <transition
      name="custom-fade"
      enter-active-class="animate__animated animate__fadeIn"
      leave-active-class="animate__animated animate__fadeOut animate__faster"
    >
      <b-img class="bg-img" v-if="computedImg" :src="computedImg" :key="computedImg"></b-img>
    </transition>
    <b-container fluid class="w-100 h-100 main-container">
      <b-row no-gutters align-h="center" class="h-100 flex-nowrap">
        <b-col cols="4">
          <SongDetailsCompact :currentSong="currentSong" />
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
                  @end="drag = false"
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
import SongDefault from '@/icons/SongDefault.vue'
import ImageLoader from '@/utils/ui/mixins/ImageLoader'
import ModelHelper from '@/utils/ui/mixins/ModelHelper'
import { vxm } from '@/mainWindow/store'
import { convertDuration } from '@/utils/common'
import QueueItem from './QueueItem.vue'
import draggable from 'vuedraggable'
import { bus } from '@/mainWindow/main'
import { EventBus } from '@/utils/main/ipc/constants'
import SongDetailsCompact from '../generic/SongDetailsCompact.vue'

@Component({
  components: {
    SongDefault,
    QueueItem,
    draggable,
    SongDetailsCompact
  }
})
export default class MusicInfo extends mixins(ImageLoader, ModelHelper) {
  get queueOrder() {
    return vxm.player.queueOrder
  }

  private scrollToActive() {
    const elem = this.$refs[`queue-item-${this.queueOrder[this.currentIndex]?.id}`]
    if (elem) {
      ;((elem as (Vue | Element)[])[0] as Vue).$el.scrollIntoView({
        behavior: 'smooth'
      })
    }
  }

  mounted() {
    this.scrollToActive()
  }

  @Watch('currentIndex')
  onIndexChange() {
    this.scrollToActive()
  }

  get currentIndex() {
    return vxm.player.queueIndex
  }

  set queueOrder(value: { id: string; songID: string }[]) {
    vxm.player.setQueueOrder(value)
  }

  private forceDefaultImg = false

  private handleError() {
    this.forceDefaultImg = true
  }

  get computedImg() {
    this.forceDefaultImg = false
    return this.getImgSrc(this.getValidImageHigh(this.currentSong))
  }

  private clear() {
    if (this.queueOrder.length > 0) {
      if (this.queueOrder.length === 1) {
        this.queueOrder = []
        vxm.player.queueIndex = -1
        vxm.player.playerState = 'STOPPED'
      } else {
        this.queueOrder = [this.queueOrder[this.currentIndex]]
        vxm.player.queueIndex = 0
      }
    }
  }

  private parseQueueItems(): Song[] {
    const songs = []
    for (const i of this.queueOrder) {
      songs.push(vxm.player.queue.data[i.songID])
    }
    return songs
  }

  private saveAsPlaylist() {
    bus.$emit(EventBus.SHOW_NEW_PLAYLIST_MODAL, this.parseQueueItems())
  }

  private handleIndexChange(change: {
    moved: { element: { id: string; songID: string }; newIndex: number; oldIndex: number }
  }) {
    if (change.moved.oldIndex === this.currentIndex) {
      vxm.player.queueIndex = change.moved.newIndex
    } else if (change.moved.newIndex === this.currentIndex) {
      if (change.moved.oldIndex < this.currentIndex) {
        vxm.player.queueIndex = vxm.player.queueIndex - 1
      } else {
        vxm.player.queueIndex = vxm.player.queueIndex + 1
      }
    }
  }

  @Prop({ default: () => {} })
  private currentSong!: Song

  private formattedDuration = convertDuration
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
  &::-webkit-scrollbar-track
    background: transparent
    margin-top: 0 !important
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
.scroller
  height: 100%
  &::-webkit-scrollbar-track
    margin: 0

.main-container
  position: absolute
  left: 0
  top: 0
  padding-top: 72px
  padding-bottom: 30px

.queue-container
  overflow-y: scroll
  color: white !important
  &::-webkit-scrollbar-track
    background: transparent
    margin: 0

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
  height: calc(100% + 28px + 5px)
  width: 100vw
  z-index: -9998
  position: absolute
  left: 0
  top: -28px
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
</style>
