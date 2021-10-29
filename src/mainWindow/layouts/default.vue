<!-- 
  default.vue is a part of Moosync.
  
  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div class="appContainer">
    <TopBar class="topbar" :class="{ 'is-open': isSidebarOpen }" />
    <Sidebar class="sidebar" />
    <MusicBar class="musicbar" />

    <div class="d-flex main-content" :class="{ 'is-open': isSidebarOpen }">
      <transition name="slide-fade">
        <router-view :key="refreshPage"></router-view>
      </transition>
    </div>
  </div>
</template>

<script lang="ts">
import MusicBar from '@/mainWindow/components/Musicbar.vue'
import Sidebar from '@/mainWindow/components/Sidebar.vue'
import TopBar from '@/mainWindow/components/TopBar.vue'
import { Component } from 'vue-property-decorator'
import ContextMenuMixin from '@/utils/ui/mixins/ContextMenuMixin'
import { mixins } from 'vue-class-component'
import { vxm } from '../store/index'

@Component({
  components: {
    Sidebar,
    TopBar,
    MusicBar
  }
})
export default class DefaultLayout extends mixins(ContextMenuMixin) {
  private refreshPage = false

  get isSidebarOpen() {
    return vxm.themes.sidebarOpen
  }

  private listenRefreshPage() {
    vxm.themes.$watch('_refreshPage', (refresh) => {
      if (refresh) {
        this.refreshPage = !this.refreshPage
        vxm.themes.refreshPage = false
      }
    })
  }

  mounted() {
    this.listenRefreshPage()
  }
}
</script>

<style lang="sass" scoped>
.musicbar
  position: fixed
  z-index: 4

.sidebar
  position: relative
  z-index: 3

.topbar
  position: fixed
  z-index: 2
  left: calc(70px + 30px + 7.5px)
  width: calc(100% - 70px - 30px - 7.5px)
  transition: 0.2s
  &.is-open
    width: calc(100% - 261px - 30px - 7.5px)
    left: calc(261px + 30px + 7.5px)

.main-content
  position: absolute
  left: calc(30px + 70px)
  top: calc(70px + 18px + 4px)
  right: 0
  bottom: calc(6rem + 30px)
  height: calc(100% - (6rem + 30px) - 70px - 11px)
  overflow-y: auto
  overflow-x: hidden
  z-index: 1
  transition: 0.2s
  padding-right: 20px
  &.is-open
    left: calc(261px + 30px)
</style>

<style lang="sass">
*::-webkit-scrollbar,
*::-webkit-scrollbar-thumb
  width: 26px
  border-radius: 13px
  background-clip: padding-box
  border: 10px solid transparent
  min-height: 50px

*::-webkit-scrollbar-thumb
  box-shadow: inset 0 0 0 10px
  min-height: 40px

*::-webkit-scrollbar-track
  margin-top: calc( 0.75rem * 2 + 18px)
  background: var(--primary)

.modal-content
  background-color: var(--primary) !important
  color: var(--textPrimary) !important
</style>
