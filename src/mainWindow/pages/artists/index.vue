<!-- 
  index.vue is a part of Moosync.
  
  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-container fluid class="album-container">
    <b-row no-gutters class="page-title">Artists</b-row>
    <b-row class="d-flex">
      <b-col col xl="2" md="3" v-for="artist in artistList" :key="artist.artist_id">
        <CardView :title="artist.artist_name" :imgSrc="artist.artist_coverPath" @click.native="gotoArtist(artist)">
          <template #defaultCover> <ArtistDefault /></template>
        </CardView>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator'
import CardView from '@/mainWindow/components/generic/CardView.vue'
import { mixins } from 'vue-class-component'
import RouterPushes from '@/utils/ui/mixins/RouterPushes'
import ArtistDefault from '@/icons/ArtistDefault.vue'

@Component({
  components: {
    CardView,
    ArtistDefault
  }
})
export default class Artists extends mixins(RouterPushes) {
  private artistList: artists[] = []
  private async getArtists() {
    this.artistList = await window.SearchUtils.searchEntityByOptions({
      artist: true
    })
  }

  mounted() {
    this.getArtists()
  }
}
</script>

<style lang="sass" scoped>
.album-container
  position: absolute

.title
  font-weight: bold
  font-size: 55px
  margin-left: 15px
  margin-bottom: 50px
  margin-top: 20px
</style>
