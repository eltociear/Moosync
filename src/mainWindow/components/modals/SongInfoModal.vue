<!-- 
  SongInfoModal.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-modal class="song-url-modal" centered size="xl" :id="id" :ref="id" hide-footer hide-header>
    <div class="modal-content-container" v-if="song">
      <b-container fluid class="p-0">
        <b-row no-gutters class="d-flex">
          <b-col cols="auto">
            <SongDefault v-if="forceEmptyImg || !song.song_coverPath_high" class="song-url-cover" />
            <b-img
              v-else
              class="song-url-cover"
              :src="getImgSrc(getValidImageHigh(song))"
              @error="handleImageError"
            ></b-img>
          </b-col>
          <b-col class="details" cols="8" xl="9">
            <b-row>
              <b-col>
                <div
                  :id="getKey('title')"
                  :title="getValue('title')"
                  class="title text-truncate"
                  @click="copyText('title')"
                >
                  {{ song.title }}
                </div>
              </b-col>
            </b-row>
            <b-row class="mt-1">
              <b-col>
                <b-tabs
                  nav-class="custom-nav"
                  active-nav-item-class="active-nav-item"
                  no-nav-style
                  content-class="mt-3 tab-inner-container"
                  justified
                  class="h-100"
                >
                  <div v-for="i in tabs" :key="i.tab">
                    <b-tab :title="i.tab" :id="i.tab">
                      <div class="tab-content">
                        <b-container fluid class="tab-content-container">
                          <b-row no-gutters>
                            <b-col cols="6" v-for="field in i.items" :key="getKey(field)" class="d-flex">
                              <div
                                :id="getKey(field)"
                                :title="getValue(field)"
                                class="subtitle text-truncate"
                                @click="copyText(field)"
                              >
                                <span class="field-title">{{ getKey(field) }}:</span>
                                <span class="ml-1">{{ getValue(field) }}</span>
                              </div>
                            </b-col>
                          </b-row>
                        </b-container>
                      </div>
                    </b-tab>
                  </div>
                </b-tabs>
              </b-col>
              <b-popover
                id="clipboard-popover"
                :show.sync="showPopover"
                :target="popoverTarget"
                :key="`${popoverTarget}-popover`"
                triggers="click blur"
                placement="top"
              >
                Copied!
              </b-popover>
            </b-row>
          </b-col>
        </b-row>
      </b-container>
      <b-button class="close-button ml-3" @click="close">Close</b-button>
    </div>
  </b-modal>
</template>

<script lang="ts">
import { Component, Prop } from 'vue-property-decorator'
import SongDefault from '@/icons/SongDefaultIcon.vue'
import { bus } from '@/mainWindow/main'
import { EventBus } from '@/utils/main/ipc/constants'
import { mixins } from 'vue-class-component'
import ImgLoader from '@/utils/ui/mixins/ImageLoader'
import { humanByteSize } from '@/utils/common'

@Component({
  components: {
    SongDefault
  }
})
export default class SongInfoModal extends mixins(ImgLoader) {
  @Prop({ default: 'SongInfo' })
  private id!: string

  private song: Song | null = null

  private forceEmptyImg = false

  private popoverTarget: string = this.getKey('path')
  private showPopover = false
  private popoverTimeout: ReturnType<typeof setTimeout> | undefined

  private tabs = [
    {
      tab: 'Song Info',
      items: [
        ['artists', (a: string[]) => this.getFirstFromArray(a)],
        ['genre', (g: string[]) => this.getFirstFromArray(g)],
        ['album', (a: Album) => a.album_name ?? ''],
        ['date_added', (d: string) => new Date(parseInt(d)).toDateString()],
        'year',
        ['size', (s: number) => humanByteSize(s)],
        ['duration', (s: number) => `${s.toFixed(2)}s`]
      ]
    },
    {
      tab: 'File Info',
      items: [
        ['bitrate', (s: number) => humanByteSize(s, true)],
        'codec',
        'container',
        ['sampleRate', (s: string) => `${s} Hz`],
        'hash',
        'path'
      ]
    }
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private fieldFilter: ([keyof Song, ((value: any) => string)?] | keyof Song)[] = []

  private getKey(t: typeof this.fieldFilter[0]) {
    let ret: string
    if (typeof t === 'string') return (ret = t)
    else ret = t[0]

    return ret.replaceAll('_', ' ')
  }

  private getValue(t: typeof this.fieldFilter[0]): string {
    if (this.song !== null) {
      if (typeof t === 'string') return this.song[t] as string
      else {
        if (t[1] && this.song[t[0]]) {
          return t[1](this.song[t[0]])
        }
      }
    }
    return ''
  }

  private getFirstFromArray(arr: string[]): string {
    return arr.length > 0 ? arr[0] : ''
  }

  private handleImageError() {
    this.forceEmptyImg = true
  }

  private close() {
    this.song = null
    this.$bvModal.hide(this.id)
  }

  private async copyText(field: typeof this.fieldFilter[0]) {
    if (this.popoverTimeout) {
      clearTimeout(this.popoverTimeout)
      this.popoverTimeout = undefined
    }

    this.popoverTarget = this.getKey(field)
    navigator.clipboard.writeText(this.getValue(field))
    this.showPopover = true
    this.popoverTimeout = setTimeout(() => (this.showPopover = false), 1000)
  }

  mounted() {
    bus.$on(EventBus.SHOW_SONG_INFO_MODAL, (song: Song) => {
      this.forceEmptyImg = false
      this.song = song
      this.$bvModal.show(this.id)
    })
  }
}
</script>

<style lang="sass">
.custom-nav
  border-bottom: none
  margin-bottom: 25px
  :not(:first-child)
    margin-left: 30px
  li
    text-align: left
    flex: 0 0 auto !important
    *
      padding: 0
      color: var(--textPrimary)

.active-nav-item
  color: var(--accent) !important
  border-bottom: var(--accent) 1px solid
</style>

<style lang="sass" scoped>
.tab-content
  position: absolute
  width: 100%
  *
    margin-bottom: 10px

.tab-content-container
  padding-left: 0

.field-title
  font-weight: 700

.modal-content-container
  height: 300px

.title
  display: inline-block
  user-select: none
  font-size: 26px

.subtitle
  display: inline-block
  font-size: 14px
  font-weight: normal
  user-select: none
  width: auto
  &::first-letter
    text-transform: capitalize

.song-url-cover
  width: 157px
  height: 157px
  object-fit: cover
  border-radius: 16px

.edit-icon
  width: 15px
  height: 15px
  min-width: 15px
  min-height: 15px
  margin-left: 15px
  margin-top: 5px

.close-button
  position: absolute
  right: 0
  bottom: 0
  font-size: 16px
  font-weight: 400
  color: var(--textPrimary)
  border-radius: 6px
  float: right
  margin-bottom: 50px
  margin-right: 50px
  border: 0
  background-color: var(--textSecondary)

.details
  margin-left: 30px
</style>
