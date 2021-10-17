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
                {{ field.key === 'index' ? index + 1 : getFieldData(field.key, item) }}
              </div>
            </div>
          </template>
        </RecycleScroller>
      </b-row>
    </b-container>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Ref, Vue } from 'vue-property-decorator'

@Component({})
export default class SongList extends Vue {
  private refreshKey: boolean = false

  private lastSelect: string = ''
  private selected: number[] = []

  @Prop({ default: [] })
  private songList!: Song[]

  @Prop({ default: {} })
  private extrafields!: [{ key: TableFields; label?: string }]

  @Prop({ default: false })
  private tableBusy!: boolean

  @Ref('headers')
  private headers!: HTMLDivElement

  // Clear selection after table loses focus
  private clearSelection() {
    this.$emit('onRowSelectionClear')
    this.selected = []
  }

  private keyPressed: 'Control' | 'Shift' | undefined

  private getFieldData(field: TableFields, song: Song) {
    switch (field) {
      case 'title':
        return song.title
      case 'album_name':
        return song.album?.album_name
      case 'artist_name':
        return song.artists?.join(', ')
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
    this.setupKeyEvents()
  }

  beforeDestroy() {
    this.destroyMouseEvents()
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

  private selectAll() {
    this.selected = Array.from({ length: this.songList.length }, (_, i) => i)
  }

  private onRowSelected(index: number) {
    if (this.keyPressed === 'Control') {
      const i = this.selected.findIndex((val) => val === index)
      if (i === -1) {
        this.selected.push(index)
      } else {
        this.selected.splice(i, 1)
      }
    } else if (this.keyPressed === 'Shift') {
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
.index-no-td
  padding: 20px 0 20px 15px !important

.index-no-th > div
  padding-left: 10px

.loading-container
  color: var(--accent)

.scroller
  &::-webkit-scrollbar-track
    margin: 0

.wrapper
  display: flex

.box
  color: var(--textPrimary)
  padding: 20px

  box-sizing: border-box

  /* Allow box to grow and shrink, and ensure they are all equally sized */
  flex: 1 1 auto

.handler
  width: 8px
  padding: 0
  cursor: ew-resize
  flex: 0 0 auto

.handler::before
  content: ''
  display: block
  width: 1px
  height: 100%
  background: var(--textSecondary)
  padding-top: 14px
  padding-bottom: 14px
  background-clip: content-box
.recycler-row
  height: calc(100% - 70px)

.field-content
  height: 64px
  border-bottom: 1px solid var(--divider)
  border-top: 1px solid transparent

.headers
  border-bottom: 1px solid var(--divider)
  div
    font-weight: bold
    font-size: 16px

.wrapper
  div
    text-align: left
    user-select: none

.selectedItem
  background: var(--secondary) !important
  border-top: 1px solid var(--accent)
  border-bottom: 1px solid var(--accent)
</style>
