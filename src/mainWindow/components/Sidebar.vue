<!-- 
  Sidebar.vue is a part of Moosync.
  
  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-sidebar
    :width="isOpen ? '261px' : '70px'"
    visible
    id="sidebar"
    no-header-close
    no-close-on-route-change
    sidebar-class="gradient sidebar-height"
  >
    <template #header>
      <div class="d-flex w-100 mt-3 justify-content-between">
        <Toggle class="toggle" @click.native="toggleOpen()" />
        <!-- <Rooms id="rooms" v-if="showRoomsButton" /> -->
        <!-- <b-popover
          v-if="showRoomsButton"
          :target="`rooms`"
          placement="rightbottom"
          title="Rooms"
          triggers="focus"
          :content="`Placement hello`"
        >
          <div>
            <b-tabs content-class="mt-3">
              <b-tab title="Join" active>
                <b-form-input
                  v-model="roomInput"
                  :formatter="formatter"
                  class="inputtext"
                  placeholder="Enter room ID"
                  aria-label="room id"
                />
                <button v-on:click="joinRoom()">Join room</button>
                <h3>{{ roomID }}</h3>
              </b-tab>
              <b-tab title="Create">
                <button v-on:click="createRoom()">Create Room</button>
                <h3>{{ roomID }}</h3>
              </b-tab>
            </b-tabs>
            <div></div>
          </div>
        </b-popover> -->
      </div>
    </template>
    <template #default>
      <div class="extra-margin-top">
        <Tabs :isOpen="isOpen" />
      </div>
    </template>
  </b-sidebar>
</template>

<script lang="ts">
import Rooms from '@/icons/Rooms.vue'
import Toggle from '@/icons/Toggle.vue'
import Tabs from '@/mainWindow/components/sidebar/Tabs.vue'
import { PeerMode } from '@/mainWindow/store/syncState'
import { Component, Vue } from 'vue-property-decorator'
import { vxm } from '../store'

@Component({
  components: {
    Toggle,
    Rooms,
    Tabs
  }
})
export default class Sidebar extends Vue {
  private roomInput: String = ''
  private showRoomsButton: boolean = true

  get roomID() {
    return vxm.sync.roomID
  }

  get isOpen() {
    return vxm.themes.sidebarOpen
  }

  set isOpen(val: boolean) {
    vxm.themes.sidebarOpen = val
  }

  private toggleOpen() {
    this.isOpen = !this.isOpen

    // Delay showing of rooms button since it makes the toggle button smaller while sidebar size is transitioning
    if (!this.showRoomsButton) setTimeout(() => (this.showRoomsButton = true), 100)
    else this.showRoomsButton = false

    this.$emit('toggleOpen', this.isOpen)
  }

  public formatter(value: string) {
    return value.toUpperCase()
  }

  private setWatcher() {
    vxm.sync.setMode(PeerMode.WATCHER)
  }

  private setBroadcaster() {
    vxm.sync.setMode(PeerMode.BROADCASTER)
  }

  private joinRoom() {
    this.$root.$emit('join-room', this.roomInput)
  }

  private createRoom() {
    this.$root.$emit('create-room')
  }
}
</script>

<style lang="sass">
.gradient
  background: linear-gradient(176.27deg, var(--secondary) 1.69%, var(--primary) 72.01%)
  border-radius: 0px 30px 0px 0px
  top: 34px !important

.b-sidebar
  transition: 0.2s

.sidebar-height
  height: calc(100% - (6.5rem + 32px))

.b-sidebar-body
  overflow-x: hidden
  &::-webkit-scrollbar-track
    margin-top: 0
    background: transparent !important
</style>

<style lang="sass" scoped>
.toggle
  margin-left: 8px

.sidebar
  position: absolute
  overflow: hidden

.icon-spacing
  margin-right: 26px
  padding-left: 6px

.extra-margin-top
  margin-top: 1rem
</style>
