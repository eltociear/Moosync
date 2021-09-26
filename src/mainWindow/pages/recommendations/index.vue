<template>
  <b-container class="recommendations-container" fluid>
    <b-row>
      <b-col class="title">Explore</b-col>
    </b-row>
    <b-row v-for="p of providers" :key="p.title">
      <b-col v-if="p.list.length > 0">
        <b-row class="mt-3">
          <b-col class="provider-title">Hot from {{ p.title }}</b-col>
        </b-row>
        <b-row class="slider-row">
          <b-col>
            <CardCarousel :songList="p.list" />
          </b-col>
        </b-row>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator'
import { mixins } from 'vue-class-component'
import RouterPushes from '@/utils/ui/mixins/RouterPushes'
import ContextMenuMixin from '@/utils/ui/mixins/ContextMenuMixin'
import { vxm } from '@/mainWindow/store'
import CardView from '../../components/generic/CardView.vue'
import CardCarousel from '../../components/generic/CardCarousel.vue'
import { GenericRecommendation } from '@/utils/ui/providers/recommendations/genericRecommendations'

@Component({
  components: {
    CardView,
    CardCarousel
  }
})
export default class Albums extends mixins(RouterPushes, ContextMenuMixin) {
  private providers: { [key: string]: { title: string; list: Song[]; provider: GenericRecommendation } } = {
    youtube: {
      title: 'Youtube',
      list: [],
      provider: vxm.providers.youtubeProvider
    },
    spotify: {
      title: 'Spotify',
      list: [],
      provider: vxm.providers.spotifyProvider
    },
    lastfm: {
      title: 'LastFM',
      list: [],
      provider: vxm.providers.lastfmProvider
    }
  }

  mounted() {
    for (const val of Object.values(this.providers)) {
      this.getResults(val.provider.getRecommendations(), val.list)
    }
  }

  private async getResults(gen: AsyncGenerator<Song[]>, list: Song[]) {
    for await (const song of gen) {
      list.push(...song)
    }
  }
}
</script>

<style lang="sass">
.VueCarousel-dot-container
  margin-top: 0 !important
  .VueCarousel-dot
    margin-top: 0 !important
</style>

<style lang="sass" scoped>
.title
  font-weight: bold
  font-size: 55px
  text-align: left

.provider-title
  font-weight: bold
  font-size: 26px
  text-align: left

.recommendations-container
  margin-bottom: 50px
  margin-top: 20px

.slider-row
  margin-top: 15px
</style>
