<template>
  <div class="topbar-container d-flex align-items-center">
    <b-container fluid class="d-flex">
      <b-row class="flex-grow-1 justify-content-start">
        <b-col cols="6" lg="7" xl="9">
          <Search />
        </b-col>
        <b-col cols="auto" class="my-auto d-flex">
          <b-row class="flex-grow-1">
            <b-col cols="auto"> <Navigation /> </b-col>
            <b-col cols="auto"> <Notifications /> </b-col>
            <b-col cols="auto"> <Accounts /></b-col>
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

@Component({
  components: {
    Search,
    Navigation,
    Accounts,
    Notifications
  }
})
export default class TopBar extends Vue {}
</script>

<style lang="sass" scoped>

.topbar-container
  background: var(--primary)
  height: 70px
</style>
