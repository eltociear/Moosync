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
                <b-input
                  :id="getKey('title')"
                  :title="getValue('title')"
                  class="title text-truncate editable"
                  :value="song.title"
                >
                </b-input>
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
                            <b-col cols="6" v-for="field in i.items" :key="getKey(field)">
                              <div class="d-flex">
                                <span @click="copyText(field)" class="field-title">{{ getKey(field) }}:</span>
                                <component
                                  :is="field[1] ? 'b-input' : 'div'"
                                  :id="getKey(field)"
                                  :title="getValue(field)"
                                  :class="`field-value ${!field[1] && 'w-100'} editable ml-1`"
                                  :value="getValue(field)"
                                >
                                  <span class="w-100 text-truncate" v-if="!field[1]">{{ getValue(field) }}</span>
                                </component>
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
      <div class="button-container">
        <b-button class="close-button ml-3" @click="close">Close</b-button>
        <b-button class="save-button ml-3" @click="save">Save</b-button>
      </div>
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tabs: { tab: string; items: [keyof Song, boolean, ((value: any) => string)?][] }[] = [
    {
      tab: 'Song Info',
      items: [
        ['artists', true, (a: string[]) => this.getFirstFromArray(a)],
        ['genre', true, (g: string[]) => this.getFirstFromArray(g)],
        ['album', true, (a: Album) => a.album_name ?? ''],
        ['date_added', true, (d: string) => new Date(parseInt(d)).toDateString()],
        ['year', true],
        ['size', false, (s: number) => humanByteSize(s)],
        ['duration', true, (s: number) => `${s.toFixed(2)}s`]
      ]
    },
    {
      tab: 'File Info',
      items: [
        ['bitrate', false, (s: number) => humanByteSize(s, true)],
        ['codec', false],
        ['container', false],
        ['sampleRate', false, (s: string) => `${s} Hz`],
        ['hash', false],
        ['path', false]
      ]
    }
  ]

  private popoverTarget: string = this.getKey(this.tabs[0]['items'][0])
  private showPopover = false
  private popoverTimeout: ReturnType<typeof setTimeout> | undefined

  private getKey(t: typeof this.tabs[0]['items'][0]) {
    let ret: string
    if (typeof t === 'string') return (ret = t)
    else ret = t[0]

    return ret.replaceAll('_', ' ')
  }

  private getValue(t: typeof this.tabs[0]['items'][0]): string {
    if (this.song !== null) {
      if (!t[2]) return this.song[t[0] as keyof Song] as string
      else {
        if (t[2] && this.song[t[0]]) {
          return t[2](this.song[t[0]])
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

  private save() {
    if (this.song) window.DBUtils.updateSongs([this.song])
  }

  private async copyText(field: typeof this.tabs[0]['items'][0]) {
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

.tab-content-container
  padding-left: 0

.field-title
  text-transform: capitalize
  font-weight: 700
  margin-bottom: 10px

.field-value
  font-size: 14px
  font-weight: 400
  width: auto
  margin-bottom: 10px

.modal-content-container
  height: 300px

.title
  user-select: none
  font-size: 26px
  margin-bottom: 10px
  width: 100%
  max-width: 100%

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

.button-container
  position: absolute
  right: 0
  bottom: 0
  margin-bottom: 50px
  margin-right: 50px

.close-button
  border-radius: 6px
  background-color: var(--textSecondary)

.save-button
  border-radius: 6px
  border: 0
  color: var(--textInverse)
  background-color: var(--accent)

.details
  margin-left: 30px

.editable
  display: flex
  align-items: center
  background-color: transparent
  border: none
  border-radius: 0
  color: var(--textPrimary)
  height: inherit
  padding: 0
  border-bottom: transparent 1px solid
  &:focus
    border-bottom: var(--accent) 1px solid
</style>
