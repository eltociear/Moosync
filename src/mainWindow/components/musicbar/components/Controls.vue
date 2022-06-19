<!-- 
  Controls.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-row align-v="center" align-h="center" no-gutters>
    <b-col cols="auto" class="mr-4" v-on:click="prevSongWrapper()">
      <PrevTrack :disabled="!enableTrackControls" />
    </b-col>
    <b-col cols="auto" class="mr-4" v-on:click="toggleRepeat()">
      <Repeat :filled="repeat" />
    </b-col>
    <b-col cols="auto" class="mr-4" v-if="isLoading">
      <b-spinner label="Loading..."></b-spinner>
    </b-col>
    <b-col cols="auto" class="mr-4" v-else v-on:click="togglePlayerState()">
      <Play :play="playerState === 'PLAYING'" />
    </b-col>
    <b-col cols="auto" class="mr-4" v-on:click="nextSongWrapper()">
      <NextTrack :disabled="!enableTrackControls" />
    </b-col>
    <b-col cols="auto" class="shuffle-icon" v-on:click="shuffle()">
      <Shuffle :filled="true" />
    </b-col>
    <b-col cols="4" align-self="center" class="timestamp-container">
      <Timestamp class="timestamp" :duration="duration" :timestamp="timestamp" />
    </b-col>
  </b-row>
</template>

<script lang="ts">
import { Component, Prop } from 'vue-property-decorator'
import PrevTrack from '@/icons/PrevTrackIcon.vue'
import NextTrack from '@/icons/NextTrackIcon.vue'
import Play from '@/icons/PlayIcon.vue'
import Repeat from '@/icons/RepeatIcon.vue'
import Shuffle from '@/icons/ShuffleIcon.vue'
import { mixins } from 'vue-class-component'
import PlayerControls from '@/utils/ui/mixins/PlayerControls'
import { vxm } from '@/mainWindow/store'
import Timestamp from '@/mainWindow/components/musicbar/components/Timestamp.vue'

@Component({
  components: {
    PrevTrack,
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

  get enableTrackControls() {
    return this.isSyncing ? vxm.sync.queueOrder.length > 1 : vxm.player.queueOrder.length > 1
  }

  private nextSongWrapper() {
    if (this.enableTrackControls) this.nextSong()
  }

  private prevSongWrapper() {
    if (this.enableTrackControls) this.prevSong()
  }

  get isLoading() {
    return vxm.player.loading
  }

  private toggleRepeat() {
    vxm.player.Repeat = !this.repeat
  }
}
</script>

<style lang="sass" scoped>
.invisible
  min-width: 0%

.timestamp-container
  display: block

.shuffle-icon
  margin-right: 1.5rem

@media only screen and (max-width : 800px)
  .timestamp-container
    display: none

  .shuffle-icon
    margin-right: 0px
</style>
