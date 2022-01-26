<!-- 
  TopBar.vue is a part of Moosync.
  
  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div class="topbar-container d-flex align-items-center">
    <b-container fluid class="d-flex">
      <b-row align-h="start" class="flex-grow-1">
        <b-col cols="auto" class="my-auto"> <Navigation /> </b-col>
        <b-col> <Search /> </b-col>
        <b-col cols="auto" class="pr-5 ml-auto my-auto icons-bar d-flex">
          <b-row class="flex-grow-1">
            <b-col cols="auto" v-if="showRefreshIcon">
              <Refresh @click.native="refreshPage" class="refresh-icon button-grow" />
            </b-col>
            <!-- <b-col cols="auto"> <Notifications /> </b-col> -->
            <b-col cols="auto"> <Accounts /></b-col>
            <b-col cols="auto"> <Gear class="gear-icon" @click.native="openSettings" /></b-col>
          </b-row>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script lang="ts">
import Navigation from '@/mainWindow/components/topbar/components/Navigation.vue'
import Search from '@/mainWindow/components/topbar/components/Search.vue'
import { Component, Prop, Vue } from 'vue-property-decorator'
import Accounts from '@/mainWindow/components/topbar/components/Accounts.vue'
import Notifications from '@/mainWindow/components/topbar/components/Notifications.vue'
import Refresh from '@/icons/Refresh.vue'

import Gear from '@/icons/Gear.vue'
import { EventBus } from '@/utils/main/ipc/constants'
import { bus } from '../../main'
import EventEmitter from 'events'

@Component({
  components: {
    Search,
    Navigation,
    Accounts,
    Notifications,
    Gear,
    Refresh
  }
})
export default class TopBar extends Vue {
  @Prop({ default: false })
  private showRefreshIcon!: boolean

  private openSettings() {
    window.WindowUtils.openWindow(false)
  }

  private refreshPage() {
    bus.$emit(EventBus.REFRESH_PAGE)
  }
}
</script>

<style lang="sass" scoped>
.topbar-container
  background: var(--primary)
  height: 70px

.gear-icon
  height: 26px
  width: 26px
  margin-left: 10px

.icons-bar
  margin-right: 30px

.refresh-icon
  height: 22px
  width: 22px
</style>
