<!-- 
  index.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div class="h-100 w-100 parent" @contextmenu="contextHandler">
    <b-container fluid>
      <b-row no-gutters class="page-title">Albums</b-row>
      <b-row class="d-flex">
        <b-col col xl="2" md="3" v-for="album in filteredAlbumList" :key="album.album_id">
          <CardView
            :title="album.album_name"
            :imgSrc="album.album_coverPath_high"
            @click.native="gotoAlbum(album)"
            @CardContextMenu="singleItemContextHandler(album, arguments[0])"
          >
            <template #defaultCover>
              <AlbumDefault />
            </template>
          </CardView>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script lang="ts">
import CardView from '@/mainWindow/components/generic/CardView.vue'
import { mixins } from 'vue-class-component'
import { Component } from 'vue-property-decorator'
import RouterPushes from '@/utils/ui/mixins/RouterPushes'
import AlbumDefault from '@/icons/AlbumDefaultIcon.vue'
import ContextMenuMixin from '@/utils/ui/mixins/ContextMenuMixin'
import { vxm } from '@/mainWindow/store'

@Component({
  components: {
    CardView,
    AlbumDefault
  }
})
export default class Albums extends mixins(RouterPushes, ContextMenuMixin) {
  private albumList: Album[] = []

  private async getAlbums() {
    this.albumList = await window.SearchUtils.searchEntityByOptions({
      album: true
    })
    this.sort()
  }

  get filteredAlbumList() {
    return this.albumList.filter((x) => {
      return x.album_name !== null
    })
  }

  private setSort(options: NormalSortOptions) {
    vxm.themes.entitySortBy = options
  }

  private sort() {
    this.albumList.sort((a, b) => {
      switch (vxm.themes.entitySortBy.type) {
        default:
        case 'name':
          return (
            (vxm.themes.entitySortBy.asc
              ? a.album_name?.localeCompare(b.album_name ?? '')
              : b.album_name?.localeCompare(a.album_name ?? '')) ?? 0
          )
      }
    })
  }

  private singleItemContextHandler(album: Album, event: MouseEvent) {
    this.getContextMenu(event, {
      type: 'ALBUM',
      args: {
        album
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
    this.getAlbums()
    vxm.themes.$watch('entitySortBy', this.sort)
  }
}
</script>
