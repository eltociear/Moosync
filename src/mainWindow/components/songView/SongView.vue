<!-- 
  SongView.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-container fluid class="song-container h-100">
    <transition
      name="custom-classes-transition"
      enter-active-class="animate__animated animate__slideInLeft animate__delay-1s animate__slideInLeft_delay"
      leave-active-class="animate__animated animate__slideOutRight animate__slideOutRight_faster"
    >
      <component
        v-bind:is="songView"
        :songList="songList"
        :currentSong="currentSong"
        :defaultDetails="defaultDetails"
        :detailsButtonGroup="detailsButtonGroup"
        :optionalProviders="optionalProviders"
        @onOptionalProviderChanged="onOptionalProviderChanged"
        @onRowDoubleClicked="queueSong([arguments[0]])"
        @onRowContext="getSongContextMenu"
        @onRowSelected="updateCoverDetails"
        @onRowSelectionClear="clearSelection"
        @onRowPlayNowClicked="playTop([arguments[0]])"
        @onArtistClicked="gotoArtist"
        @onAlbumClicked="gotoAlbum"
        @playAll="playAll"
        @addToQueue="addToQueue"
        @addToLibrary="addToLibrary"
      ></component>
    </transition>
  </b-container>
</template>

<script lang="ts">
import { Component, Prop, Watch } from 'vue-property-decorator'
import { mixins } from 'vue-class-component'
import PlayerControls from '@/utils/ui/mixins/PlayerControls'
import ModelHelper from '@/utils/ui/mixins/ModelHelper'
import RemoteSong from '@/utils/ui/mixins/remoteSongMixin'
import ImgLoader from '@/utils/ui/mixins/ImageLoader'
import { vxm } from '@/mainWindow/store'
import SongViewClassic from '@/mainWindow/components/songView/components/SongViewClassic.vue'
import SongViewCompact from '@/mainWindow/components/songView/components/SongViewCompact.vue'
import { sortSongList } from '@/utils/common'
import RouterPushes from '@/utils/ui/mixins/RouterPushes'

@Component({
  components: {
    SongViewClassic,
    SongViewCompact
  }
})
export default class AllSongs extends mixins(PlayerControls, ModelHelper, RemoteSong, ImgLoader, RouterPushes) {
  @Prop({ default: () => [] })
  private songList!: Song[]

  private ignoreSort = false

  @Prop({ default: false })
  private tableBusy!: boolean

  @Prop({ default: () => [] })
  private optionalProviders!: ProviderHeaderOptions[]

  private sort(SongSortOptions: SongSortOptions) {
    if (!this.ignoreSort) {
      sortSongList(this.songList, SongSortOptions)
      this.ignoreSort = true
    } else {
      this.ignoreSort = false
    }
  }

  onSortChange() {
    vxm.themes.$watch(
      'sortBy',
      (SongSortOptions: SongSortOptions) => {
        this.sort(SongSortOptions)
      },
      { deep: true, immediate: true }
    )
  }

  @Watch('songList') onSongListChange() {
    this.sort(vxm.themes.songSortBy)
  }

  mounted() {
    this.onSortChange()
  }

  private get songView() {
    return vxm.themes.songView === 'compact' ? 'SongViewCompact' : 'SongViewClassic'
  }

  private selected: Song[] | null = null
  private selectedCopy: Song[] | null = null

  private currentSong: Song | null | undefined = null

  @Prop({
    default: () => {
      return { defaultTitle: '', defaultSubtitle: '', defaultCover: '' }
    }
  })
  private defaultDetails!: SongDetailDefaults

  @Prop({
    default: () => {
      return {
        enableContainer: false,
        enableLibraryStore: false
      }
    }
  })
  private detailsButtonGroup!: SongDetailButtons

  private clearSelection() {
    this.currentSong = null
    this.selected = this.selectedCopy
    this.selectedCopy = null
  }

  private updateCoverDetails(items: Song[]) {
    if (items) this.currentSong = items[items.length - 1]
    this.selected = items
    this.selectedCopy = items
  }

  private getSongContextMenu(event: Event, item: Song) {
    event.stopPropagation()
    this.$emit('onRowContext', event, item)
  }

  private playAll() {
    this.playTop(this.selected ?? this.songList)
    this.selected = this.selectedCopy
  }

  private addToQueue() {
    this.queueSong(this.selected ?? this.songList)
    this.selected = this.selectedCopy
  }

  private addToLibrary() {
    this.addSongsToLibrary(...(this.selected ?? this.songList))
    this.selected = this.selectedCopy
  }

  private onOptionalProviderChanged(...args: unknown[]) {
    this.$emit('onOptionalProviderChanged', ...args)
  }
}
</script>

<style lang="sass" scoped>
.song-container
  padding-top: 10px
  overflow: hidden

.compact-container
  padding-top: 25px

.song-list-compact
  padding-right: 30px
</style>
