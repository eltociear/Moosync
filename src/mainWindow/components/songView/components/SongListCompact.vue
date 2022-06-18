<!-- 
  SongListCompact.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div class="d-flex h-100 w-100">
    <b-container fluid>
      <TabCarousel v-on="$listeners" :optionalProviders="optionalProviders" />
      <b-row no-gutters class="h-100">
        <RecycleScroller
          class="scroller w-100 low-height"
          :items="songList"
          :item-size="94"
          key-field="_id"
          :direction="'vertical'"
          v-click-outside="clearSelection"
        >
          <template v-slot="{ item, index }">
            <SongListCompactItem
              :item="item"
              :index="index"
              :selected="selected"
              @onRowDoubleClicked="onRowDoubleClicked"
              @onRowSelected="onRowSelected"
              @onRowContext="onRowContext"
              @onPlayNowClicked="onPlayNowClicked"
              @onArtistClicked="onArtistClicked"
            />
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
import { Component, Prop } from 'vue-property-decorator'
import SongListCompactItem from './SongListCompactItem.vue'
import EllipsisIcon from '@/icons/EllipsisIcon.vue'
import TabCarousel from '../../generic/TabCarousel.vue'

@Component({
  components: {
    SongListCompactItem,
    EllipsisIcon,
    TabCarousel
  }
})
export default class SongListCompact extends mixins(ImgLoader, SongListMixin) {
  @Prop({ default: () => [] })
  private optionalProviders!: ProviderHeaderOptions[]

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

  private onArtistClicked(item: Artists) {
    this.$emit('onArtistClicked', item)
  }
}
</script>

<style lang="sass" scoped>
.scroller
  color: var(--textPrimary)
  transition: color 0.3s ease

.low-height
  height: calc(100% - 40px - 13px)
</style>
