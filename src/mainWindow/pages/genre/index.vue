<template>
  <b-container fluid class="album-container">
    <b-row no-gutters class="page-title">Genres</b-row>
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
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator'
import CardView from '@/mainWindow/components/generic/CardView.vue'
import { mixins } from 'vue-class-component'
import RouterPushes from '@/utils/ui/mixins/RouterPushes'
import SongDefault from '@/icons/SongDefault.vue'

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
.album-container
  position: absolute

.title
  font-weight: bold
  font-size: 55px
  margin-left: 15px
  margin-bottom: 50px
  margin-top: 20px
</style>
