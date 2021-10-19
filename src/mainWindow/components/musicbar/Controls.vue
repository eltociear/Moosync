<template>
  <b-row align-v="center" class="justify-content-center">
    <b-col cols="auto" align-self="center" class="mr-auto">
      <Timestamp class="invisible timestamp" :duration="duration" timestamp="0" />
    </b-col>
    <b-col cols="auto" v-on:click="prevSong()">
      <LastTrack />
    </b-col>
    <b-col cols="auto" v-on:click="toggleRepeat()">
      <Repeat :filled="repeat" />
    </b-col>
    <b-col cols="auto" v-if="isLoading">
      <b-spinner label="Loading..."></b-spinner>
    </b-col>
    <b-col cols="auto" v-else v-on:click="togglePlayerState()">
      <Play :play="playerState === 'PLAYING'" />
    </b-col>
    <b-col cols="auto" v-on:click="nextSong()">
      <NextTrack />
    </b-col>
    <b-col cols="auto" v-on:click="shuffle()">
      <Shuffle :filled="true" />
    </b-col>
    <b-col cols="auto" align-self="center" class="mr-auto">
      <Timestamp class="timestamp" :duration="duration" :timestamp="timestamp" />
    </b-col>
  </b-row>
</template>

<script lang="ts">
import { Component, Prop } from 'vue-property-decorator'
import LastTrack from '@/icons/LastTrack.vue'
import NextTrack from '@/icons/NextTrack.vue'
import Play from '@/icons/Play.vue'
import Repeat from '@/icons/Repeat.vue'
import Shuffle from '@/icons/Shuffle.vue'
import { mixins } from 'vue-class-component'
import PlayerControls from '@/utils/ui/mixins/PlayerControls'
import { vxm } from '@/mainWindow/store'
import Timestamp from './Timestamp.vue'

@Component({
  components: {
    LastTrack,
    NextTrack,
    Play,
    Repeat,
    Shuffle,
    Timestamp
  }
})
export default class MusicBar extends mixins(PlayerControls) {
  @Prop({ default: 0 })
  private duration!: number

  @Prop({ default: 0 })
  private timestamp!: number

  get repeat() {
    return vxm.player.Repeat
  }

  get playerState() {
    return vxm.player.playerState
  }

  get isLoading() {
    return vxm.player.loading
  }

  private toggleRepeat() {
    vxm.player.repeat = !this.repeat
  }
}
</script>

<style lang="sass" scoped>
.invisible
  min-width: 0%
</style>
