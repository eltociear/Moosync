<!-- 
  SongListCompact.vue is a part of Moosync.
  
  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

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
                <b-col
                  cols="auto"
                  align-self="center"
                  class="ml-5 mr-3 py-2 ellipsis-icon"
                  @click="onRowContext(arguments[0], item)"
                >
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
import SongListMixin from '@/utils/ui/mixins/SongListMixin'
import { mixins } from 'vue-class-component'
import { Component } from 'vue-property-decorator'
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
export default class SongListCompact extends mixins(ImgLoader, SongListMixin) {
  private formattedDuration = convertDuration

  private get currentSong() {
    return vxm.player.currentSong
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
}
</script>

<style lang="sass" scoped>
.scroller
  color: var(--textPrimary)
  transition: color 0.3s ease

.wrapper
  background: var(--secondary)
  border-radius: 17px
  height: 80px
  border: 1px solid transparent
  &:hover
    border: 1px solid var(--divider)
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

.ellipsis-icon
  cursor: pointer
</style>
