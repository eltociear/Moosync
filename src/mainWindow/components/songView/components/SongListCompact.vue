<!-- 
  SongListCompact.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div class="d-flex h-100 w-100">
    <b-container fluid>
      <b-row v-if="optionalProviders.length > 0">
        <b-col class="song-header-options w-100">
          <b-row no-gutters align-v="center" class="h-100">
            <b-col
              v-for="provider in optionalProviders"
              cols="auto"
              class="h-100 item-checkbox-col mr-3"
              :key="provider.key"
            >
              <div class="h-100 d-flex item-checkbox-container">
                <b-checkbox
                  class="align-self-center"
                  :value="provider.key"
                  v-model="selectedProviders"
                  @change="onOptionalProviderChanged(provider.key)"
                />
                <span class="align-self-center">{{ provider.title }}</span>
              </div>
            </b-col>
            <b-col cols="auto" class="ml-auto">
              <SortIcon @click.native="showSortMenu" />
            </b-col>
          </b-row>
        </b-col>
      </b-row>
      <b-row no-gutters class="h-100">
        <RecycleScroller
          class="scroller w-100"
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
import SortIcon from '@/icons/SortIcon.vue'

@Component({
  components: {
    SongListCompactItem,
    SortIcon
  }
})
export default class SongListCompact extends mixins(ImgLoader, SongListMixin) {
  @Prop({ default: () => [] })
  private optionalProviders!: ProviderHeaderOptions[]

  private selectedProviders: string[] = []

  private onRowContext(event: Event, item: Song) {
    this.$emit(
      'onRowContext',
      event,
      this.selected.length > 1 ? this.selected.map((val) => this.songList[val]) : [item]
    )
  }

  private onOptionalProviderChanged(key: string) {
    const checked = this.selectedProviders.includes(key)
    this.$emit('onOptionalProviderChanged', { key, checked })
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

  private showSortMenu(event: MouseEvent) {
    this.$emit('onSortClicked', event)
  }
}
</script>

<style lang="sass" scoped>
.scroller
  color: var(--textPrimary)
  transition: color 0.3s ease
  height: calc(100% - 40px - 13px)

.song-header-options
  height: 40px
  background: var(--secondary)
  border-radius: 10px
  margin-left: 15px
  margin-right: 40px
  margin-bottom: 13px

.item-checkbox-container
  background: var(--tertiary)
  border-radius: 8px
  padding-left: 15px
  padding-right: 15px

.item-checkbox-col
  padding-top: 5px
  padding-bottom: 5px
</style>
