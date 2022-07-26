<!-- 
  index.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div class="h-100 w-100 parent" @contextmenu="contextHandler">
    <b-container fluid>
      <b-row no-gutters class="page-title">{{ $t('pages.artists') }}</b-row>
      <b-row class="d-flex">
        <b-col col xl="2" md="3" v-for="artist in artistList" :key="artist.artist_id">
          <CardView
            :title="artist.artist_name"
            :imgSrc="artist.artist_coverPath"
            @click.native="gotoArtist(artist)"
            @CardContextMenu="singleItemContextHandler(artist, arguments[0])"
          >
            <template #defaultCover> <ArtistDefault /></template>
          </CardView>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator'
import CardView from '@/mainWindow/components/generic/CardView.vue'
import { mixins } from 'vue-class-component'
import RouterPushes from '@/utils/ui/mixins/RouterPushes'
import ArtistDefault from '@/icons/ArtistDefaultIcon.vue'
import { vxm } from '@/mainWindow/store'
import ContextMenuMixin from '@/utils/ui/mixins/ContextMenuMixin'

@Component({
  components: {
    CardView,
    ArtistDefault
  }
})
export default class ArtistsPage extends mixins(RouterPushes, ContextMenuMixin) {
  private artistList: Artists[] = []
  private async getArtists() {
    this.artistList = await window.SearchUtils.searchEntityByOptions({
      artist: true
    })
    this.sort()
  }

  private sort() {
    this.artistList.sort((a, b) => {
      switch (vxm.themes.entitySortBy.type) {
        default:
        case 'name':
          return (
            (vxm.themes.entitySortBy.asc
              ? a.artist_name?.localeCompare(b.artist_name ?? '')
              : b.artist_name?.localeCompare(a.artist_name ?? '')) ?? 0
          )
      }
    })
  }

  private setSort(options: NormalSortOptions) {
    vxm.themes.entitySortBy = options
  }

  private singleItemContextHandler(artist: Artists, event: MouseEvent) {
    this.getContextMenu(event, {
      type: 'ARTIST',
      args: {
        artist
      }
    })
  }

  private contextHandler(event: MouseEvent) {
    this.getContextMenu(event, {
      type: 'ENTITY_SORT',
      args: {
        sortOptions: {
          callback: this.setSort,
          current: vxm.themes.entitySortBy
        }
      }
    })
  }

  mounted() {
    this.getArtists()
    vxm.themes.$watch('entitySortBy', this.sort)
  }
}
</script>

<style lang="sass" scoped>
.title
  font-weight: bold
  font-size: 55px
  margin-left: 15px
  margin-bottom: 50px
  margin-top: 20px
</style>
