<template>
  <div class="d-flex h-100 w-100">
    <b-container fluid>
      <b-row no-gutters class="h-100">
        <RecycleScroller
          class="scroller w-100 h-100"
          :items="songList"
          :item-size="94"
          key-field="_id"
          :direction="'vertical'"
          v-click-outside="clearSelection"
        >
          <template v-slot="{ item, index }">
            <b-container
              fluid
              @dblclick="onRowDoubleClicked(item)"
              @click="onRowSelected(index)"
              @contextmenu="onRowContext(arguments[0], item)"
              class="wrapper w-100"
              :class="{ selectedItem: selected.includes(index) }"
            >
              <b-row no-gutters align-content="center" class="w-100">
                <LowImageCol
                  @click.native="onPlayNowClicked(item)"
                  height="56px"
                  width="56px"
                  :src="getValidImageLow(item)"
                />
                <b-col cols="5" class="ml-2" align-self="center">
                  <b-row no-gutters align-v="center">
                    <b-col class="title text-truncate mr-2"> {{ item.title }} </b-col>
                    <YoutubeIcon
                      v-if="item.type === 'YOUTUBE'"
                      :color="'#E62017'"
                      :filled="true"
                      :dropShadow="true"
                      class="provider-icon"
                    />
                    <SpotifyIcon
                      v-if="item.type === 'SPOTIFY'"
                      :color="'#1ED760'"
                      :filled="true"
                      :dropShadow="true"
                      class="provider-icon"
                    />
                  </b-row>
                  <b-row no-gutters>
                    <b-col class="subtitle text-truncate"> {{ item.artists.join(', ') }} </b-col>
                  </b-row>
                </b-col>
                <b-col cols="auto" align-self="center" offset="1" class="ml-auto timestamp">
                  {{ item._id === currentSong && currentSong._id ? 'Now Playing' : formattedDuration(item.duration) }}
                </b-col>
                <b-col cols="auto" align-self="center" class="button-icon ml-5">
                  <AddToQueue title="Add song to queue" @click.native="onRowDoubleClicked(item)"
                /></b-col>
                <b-col cols="auto" align-self="center" class="ml-5" @click="onRowContext(arguments[0], item)">
                  <Ellipsis
                /></b-col>
              </b-row>
            </b-container>
          </template>
        </RecycleScroller>
      </b-row>
    </b-container>
  </div>
</template>

<script lang="ts">
import ImgLoader from '@/utils/ui/mixins/ImageLoader'
import { mixins } from 'vue-class-component'
import { Component, Prop, Ref, Vue } from 'vue-property-decorator'
import LowImageCol from './LowImageCol.vue'
import Ellipsis from '@/icons/Ellipsis.vue'
import YoutubeIcon from '../../../icons/Youtube.vue'
import SpotifyIcon from '../../../icons/Spotify.vue'
import { convertDuration } from '@/utils/common'
import AddToQueue from '@/icons/AddToQueue.vue'
import PlainPlay from '../../../icons/AddToLibrary.vue'
import { vxm } from '@/mainWindow/store'

@Component({
  components: {
    LowImageCol,
    Ellipsis,
    YoutubeIcon,
    SpotifyIcon,
    PlainPlay,
    AddToQueue
  }
})
export default class SongListCompact extends mixins(ImgLoader) {
  private refreshKey: boolean = false

  private lastSelect: string = ''
  private selected: number[] = []

  @Prop({ default: [] })
  private songList!: Song[]

  @Prop({ default: false })
  private tableBusy!: boolean

  private formattedDuration = convertDuration

  // Clear selection after table loses focus
  private clearSelection() {
    this.$emit('onRowSelectionClear')
    this.selected = []
  }

  private get currentSong() {
    return vxm.player.currentSong
  }

  private keyPressed: 'Control' | 'Shift' | undefined

  private getAlbumName(data: Song) {
    if (data.album && data.album.album_name) return data.album.album_name
    return '-'
  }

  mounted() {
    this.setupKeyEvents()
  }

  beforeDestroy() {
    this.destroyKeyEvents()
  }

  private handlerMap: {
    [key: string]: {
      handler: HTMLDivElement
      next: HTMLDivElement
      prev: HTMLDivElement
      prevWidth: number
      nextWidth: number
      startPos: number
    }
  } = {}

  private activeHandlerKey?: string

  private onKeyUp(e: KeyboardEvent) {
    if (e.key === 'Shift' && this.keyPressed === 'Shift') this.keyPressed = undefined
    else if (e.key === 'Control' && this.keyPressed === 'Control') this.keyPressed = undefined
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.shiftKey || e.ctrlKey) this.keyPressed = e.key as 'Shift' | 'Control'
    if (e.ctrlKey && e.key === 'a') this.selectAll()
  }

  private setupKeyEvents() {
    document.addEventListener('keydown', this.onKeyDown)
    document.addEventListener('keyup', this.onKeyUp)
  }

  private destroyKeyEvents() {
    document.removeEventListener('keydown', this.onKeyDown)
    document.removeEventListener('keyup', this.onKeyUp)
  }

  private onRowContext(event: Event, item: Song) {
    this.$emit(
      'onRowContext',
      event,
      this.selected.length > 1 ? this.selected.map((val) => this.songList[val]) : [item]
    )
  }

  private onRowDoubleClicked(item: Song) {
    this.$emit('onRowDoubleClicked', item)
  }

  private onPlayNowClicked(item: Song) {
    this.$emit('onRowPlayNowClicked', item)
  }

  private selectAll() {
    this.selected = Array.from({ length: this.songList.length }, (_, i) => i)
  }

  private onRowSelected(index: number) {
    if (this.keyPressed === 'Control') this.selected.push(index)
    else if (this.keyPressed === 'Shift') {
      if (this.selected.length > 0) {
        const lastSelected = this.selected[0]
        const min = Math.min(lastSelected, index)
        const max = Math.max(lastSelected, index)
        this.selected = Array.from({ length: max - min + 1 }, (_, i) => min + i)
      }
    } else this.selected = [index]
    this.$emit(
      'onRowSelected',
      this.selected.map((val) => this.songList[val])
    )
  }

  // For some reason table isn't rerendered on window size change through maximize and minimize functions
  private rerenderTable() {
    this.refreshKey = !this.refreshKey
  }
}
</script>

<style lang="sass" scoped>
.scroller
  color: transparent
  transition: color 0.3s ease
  &::-webkit-scrollbar-track
    background: transparent
    margin: 0
  &:hover
    color: white

.wrapper
  background: var(--secondary)
  border-radius: 17px
  height: 80px
  transition: border 0.2s ease
  border: 1px solid transparent
  div
    user-select: none

.selectedItem
  background: var(--secondary) !important
  border: 1px solid var(--accent) !important

.title
  color: var(--textPrimary)
  font-weight: bold
  font-size: 16px

.subtitle
  color: var(--textPrimary)
  font-size: 14px

.timestamp
  font-size: 14px
  color: var(--textSecondary)

.button-icon
  @media (max-width: 1213px)
    display: none
</style>
