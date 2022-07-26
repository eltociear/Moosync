<!-- 
  index.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div class="h-100 w-100 parent">
    <b-container class="recommendations-container" fluid>
      <b-row no-gutters class="page-title">{{ $t('pages.explore') }}</b-row>
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
      <b-row v-for="e of extensionResults" :key="e.packageName">
        <b-col v-if="e.songs.length > 0">
          <b-row class="mt-3">
            <b-col class="provider-title">Hot from {{ e.providerName }}</b-col>
          </b-row>
          <b-row class="slider-row">
            <b-col>
              <CardCarousel :songList="e.songs" />
            </b-col>
          </b-row>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator'
import { mixins } from 'vue-class-component'
import RouterPushes from '@/utils/ui/mixins/RouterPushes'
import ContextMenuMixin from '@/utils/ui/mixins/ContextMenuMixin'
import { vxm } from '@/mainWindow/store'
import CardView from '../../components/generic/CardView.vue'
import CardCarousel from '../../components/generic/CardCarousel.vue'
import { GenericRecommendation } from '@/utils/ui/providers/generics/genericRecommendations'

@Component({
  components: {
    CardView,
    CardCarousel
  }
})
export default class Albums extends mixins(RouterPushes, ContextMenuMixin) {
  private providers: { [key: string]: { title: string; list: Song[]; provider: GenericRecommendation } } = {
    youtube: {
      title: this.$tc('providers.youtube'),
      list: [],
      provider: vxm.providers.youtubeProvider
    },
    spotify: {
      title: this.$tc('providers.spotify'),
      list: [],
      provider: vxm.providers.spotifyProvider
    },
    lastfm: {
      title: this.$tc('providers.lastfm'),
      list: [],
      provider: vxm.providers.lastfmProvider
    }
  }

  private extensionResults: { packageName: string; providerName: string; songs: Song[] }[] = []

  mounted() {
    for (const val of Object.values(this.providers)) {
      this.getResults(val.provider.getRecommendations(), val.list)
    }

    this.getExtensionResults()
  }

  private async getExtensionResults() {
    const data = await window.ExtensionUtils.sendEvent({
      type: 'requestedRecommendations',
      data: []
    })

    if (data) {
      for (const [key, value] of Object.entries(data)) {
        if (value) {
          this.extensionResults.push({ ...value, packageName: key })
        }
      }
    }
  }

  private async getResults(gen: AsyncGenerator<Song[]>, list: Song[]) {
    for await (const song of gen) {
      list.push(...song.filter((val) => !list.find((l) => val._id === l._id)))
    }
  }
}
</script>

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
