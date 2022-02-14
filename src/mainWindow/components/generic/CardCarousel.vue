<!-- 
  CardCarousel.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <carousel
    :perPage="1"
    :perPageCustom="[
      [1700, 6],
      [1500, 5],
      [1237, 4],
      [1015, 3],
      [790, 2]
    ]"
    paginationActiveColor="#ffffff"
    paginationColor="#000000"
  >
    <slide v-for="item in songList" :key="item._id" @slide-click="playSong(item)">
      <CardView
        :id="item._id"
        :title="item.title"
        :subtitle="item.artists ? item.artists.join(', ') : ''"
        :imgSrc="getValidImageHigh(item)"
        @CardContextMenu="showContextMenu(arguments[0], item)"
      >
        <template #defaultCover> <SongDefault /></template>
        <template #overlay>
          <div class="play-icon">
            <Play2 /></div
        ></template>
      </CardView>
    </slide>
  </carousel>
</template>

<script lang="ts">
import ImgLoader from '@/utils/ui/mixins/ImageLoader'
import { mixins } from 'vue-class-component'
import { Component, Prop } from 'vue-property-decorator'
import CardView from '../../components/generic/CardView.vue'
import SongDefault from '@/icons/SongDefaultIcon.vue'
import Play2 from '@/icons/PlayIcon2.vue'
import PlayerControls from '@/utils/ui/mixins/PlayerControls'
import ContextMenuMixin from '@/utils/ui/mixins/ContextMenuMixin'

@Component({
  components: {
    CardView,
    SongDefault,
    Play2
  }
})
export default class CardCarousel extends mixins(ImgLoader, PlayerControls, ContextMenuMixin) {
  @Prop({ default: () => [] })
  private songList!: Song[]

  private playSong(song: Song) {
    this.playTop([song])
  }

  private showContextMenu(event: Event, song: Song) {
    this.getContextMenu(event, {
      type: 'PLAYLIST_CONTENT',
      args: {
        isRemote: true,
        songs: [song],
        refreshCallback: () => {}
      }
    })
  }
}
</script>

<style lang="sass" scoped>
.play-icon > svg
  width: 40px
  height: 40px
</style>