<!-- 
  index.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div class="h-100 w-100 parent">
    <b-container fluid>
      <b-row no-gutters class="page-title">{{ $t('pages.genres') }}</b-row>
      <b-row class="d-flex">
        <b-col col xl="2" md="3" v-for="genre in genres" :key="genre.genre_id">
          <CardView
            :title="genre.genre_name ? genre.genre_name : 'Unknown'"
            :imgSrc="genre.genre_coverPath"
            @click.native="gotoGenre(genre)"
          >
            <template #defaultCover> <SongDefault /></template>
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
import SongDefault from '@/icons/SongDefaultIcon.vue'

@Component({
  components: {
    CardView,
    SongDefault
  }
})
export default class Genres extends mixins(RouterPushes) {
  private genres: Genre[] = []
  private async getgenres() {
    this.genres = await window.SearchUtils.searchEntityByOptions({
      genre: true
    })
  }

  mounted() {
    this.getgenres()
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
