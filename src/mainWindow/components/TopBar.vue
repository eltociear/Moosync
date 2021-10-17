<template>
  <div class="topbar-container d-flex align-items-center">
    <b-container fluid class="d-flex">
      <b-row align-h="start" class="flex-grow-1">
        <b-col cols="auto my-auto"> <Navigation /> </b-col>
        <b-col cols="7">
          <Search />
        </b-col>
        <b-col cols="auto" class="pr-5 ml-auto my-auto d-flex">
          <b-row class="flex-grow-1">
            <b-col cols="auto"> <Notifications /> </b-col>
            <b-col cols="auto"> <Accounts /></b-col>
            <b-col cols="auto"> <Gear class="gear-icon" @click.native="openSettings" /></b-col>
          </b-row>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script lang="ts">
import Navigation from '@/mainWindow/components/topbar/Navigation.vue'
import Search from '@/mainWindow/components/topbar/Search.vue'
import { Component, Vue } from 'vue-property-decorator'
import Accounts from '@/mainWindow/components/topbar/Accounts.vue'
import Notifications from '@/mainWindow/components/topbar/Notifications.vue'
import Gear from '@/icons/Gear.vue'

@Component({
  components: {
    Search,
    Navigation,
    Accounts,
    Notifications,
    Gear
  }
})
export default class TopBar extends Vue {
  private openSettings() {
    window.WindowUtils.openWindow(false)
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
</style>
