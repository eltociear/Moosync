<!-- 
  SongList.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div class="d-flex h-100 w-100">
    <b-container fluid>
      <b-row no-gutters>
        <div ref="headers" class="wrapper w-100 headers">
          <template v-for="(field, index) of extrafields">
            <div
              :title="field.label ? field.label : field.key"
              :style="{ width: columnWidths[index] + '%' }"
              :key="`box-${field.key}`"
              class="box text-truncate"
            >
              {{ field.label ? field.label : field.key }}
            </div>
            <div
              v-if="index !== extrafields.length - 1"
              :key="`handler-${field.key}`"
              :id="field.key"
              class="handler"
              @mousedown="mouseDown(arguments[0], field.key)"
            ></div>
          </template>
        </div>
      </b-row>
      <b-row no-gutters class="recycler-row">
        <RecycleScroller
          class="scroller w-100 h-100"
          :items="songList"
          :item-size="64"
          key-field="_id"
          :direction="'vertical'"
          v-click-outside="clearSelection"
        >
          <template v-slot="{ item, index }">
            <div class="wrapper w-100 field-content" :class="{ selectedItem: selected.includes(index) }">
              <div
                v-for="(field, i1) of extrafields"
                :key="`${item._id}-${field.key}`"
                class="box text-truncate"
                :style="{ width: columnWidths[i1] + '%' }"
                :title="field.key === 'index' ? index + 1 : getFieldData(field.key, item)"
                @dblclick="onRowDoubleClicked(item)"
                @click="onRowSelected(index)"
                @contextmenu="onRowContext(arguments[0], item)"
              >
                <div
                  :class="field.key === 'album_name' ? 'col-content' : ''"
                  v-if="typeof getFieldData(field.key, item) === 'string'"
                  @click="onTextClick(field.key, item)"
                >
                  {{ getFieldData(field.key, item, index) }}
                </div>
                <div class="d-flex" v-if="typeof getFieldData(field.key, item) === 'object'">
                  <div
                    v-for="(artist, index) in getFieldData(field.key, item, index)"
                    :key="index"
                    @click="onTextClick(field.key, artist)"
                    :class="field.key === 'artist_name' ? 'col-content' : ''"
                    class="ml-1"
                  >
                    {{ artist.artist_name }}{{ index !== item.artists.length - 1 ? ',' : '' }}
                  </div>
                </div>
              </div>
            </div>
          </template>
        </RecycleScroller>
      </b-row>
    </b-container>
  </div>
</template>

<script lang="ts">
import SongListMixin from '@/utils/ui/mixins/SongListMixin'
import { mixins } from 'vue-class-component'
import { Component, Prop, Ref, Vue } from 'vue-property-decorator'

@Component({})
export default class SongList extends mixins(SongListMixin) {
  private refreshKey = false

  @Prop({ default: {} })
  private extrafields!: [{ key: TableFields; label?: string }]

  @Prop({ default: false })
  private isLoading!: boolean

  @Ref('headers')
  private headers!: HTMLDivElement

  private getFieldData(field: TableFields, song: Song, index: number) {
    switch (field) {
      case 'index':
        return (index + 1).toString()
      case 'title':
        return song.title
      case 'album_name':
        return song.album?.album_name
      case 'artist_name':
        return song.artists
    }
  }

  private getAlbumName(data: Song) {
    if (data.album && data.album.album_name) return data.album.album_name
    return '-'
  }

  mounted() {
    this.computeDefaultWidths()
    this.generateHandlerMap()
    this.setupMouseEvents()
  }

  beforeDestroy() {
    this.destroyMouseEvents()
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

  private columnWidths: number[] = []

  private async computeDefaultWidths() {
    await this.loadWidths()
    if (this.columnWidths.length === 0) {
      for (const index in this.extrafields) {
        this.columnWidths[index] = 100 / this.extrafields.length - 8
      }
    }
  }

  private generateHandlerMap() {
    for (const field of this.extrafields) {
      const handler = document.querySelector(`#${field.key}`) as HTMLDivElement | null
      if (handler) {
        this.handlerMap[field.key] = {
          handler: handler,
          next: handler.nextElementSibling as HTMLDivElement,
          prev: handler.previousElementSibling as HTMLDivElement,
          prevWidth: 0,
          nextWidth: 0,
          startPos: 0
        }
      }
    }
  }

  private mouseDown(e: MouseEvent, id: string) {
    const handlerData = this.handlerMap[id]
    handlerData.startPos = e.pageX
    handlerData.prevWidth = handlerData.prev.offsetWidth
    handlerData.nextWidth = handlerData.next.offsetWidth
    this.activeHandlerKey = id
  }

  private getNextField(key: string) {
    const index = this.extrafields.findIndex((val) => val.key === key)
    if (index !== -1) {
      return index + 1
    }
  }

  private mouseMove(e: MouseEvent) {
    if (!this.activeHandlerKey) {
      return
    }

    const handlerData = this.handlerMap[this.activeHandlerKey]
    const pointerRelativeXpos = e.pageX - handlerData.startPos

    const minWidth = 3

    const prevWidthP = ((handlerData.prevWidth + pointerRelativeXpos) / this.headers.offsetWidth) * 100
    const nextWidthP = ((handlerData.nextWidth - pointerRelativeXpos) / this.headers.offsetWidth) * 100

    if (nextWidthP < minWidth || prevWidthP < minWidth) {
      return
    }

    const rightI = this.getNextField(this.activeHandlerKey)

    if (rightI) {
      Vue.set(this.columnWidths, rightI - 1, prevWidthP + 1)
      Vue.set(this.columnWidths, rightI, nextWidthP + 1)
    }
  }

  private mouseUp() {
    this.activeHandlerKey = undefined
    this.saveWidths()
  }

  private setupMouseEvents() {
    document.addEventListener('mousemove', this.mouseMove)
    document.addEventListener('mouseup', this.mouseUp)
  }

  private destroyMouseEvents() {
    document.removeEventListener('mousemove', this.mouseMove)
    document.removeEventListener('mouseup', this.mouseUp)
  }

  private saveWidths() {
    return window.PreferenceUtils.saveSelective('UI.columnHeaders.widths', this.columnWidths, false)
  }

  private async loadWidths() {
    this.columnWidths =
      ((await window.PreferenceUtils.loadSelective('UI.columnHeaders.widths', false)) as number[]) ?? []
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

  private async onTextClick(key: TableFields, item: Song | string) {
    if (key === 'artist_name' && typeof item === 'string') {
      const data = await window.SearchUtils.searchEntityByOptions({ artist: { artist_name: item } })
      this.$emit('onArtistClicked', data[0])
    } else if (key === 'album_name' && typeof item !== 'string') {
      this.$emit('onAlbumClicked', item.album)
    }
  }

  private sortContent(): void {
    // TODO: Sort content without b-table sort since we have table resizers
  }

  // For some reason table isn't rerendered on window size change through maximize and minimize functions
  private rerenderTable() {
    this.refreshKey = !this.refreshKey
  }
}
</script>

<style lang="sass">
.col-content
  text-decoration: none
  cursor: pointer
  &:hover
    text-decoration: underline
</style>
