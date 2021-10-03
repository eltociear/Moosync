<template>
  <div class="d-flex flex-column">
    <router-link
      v-for="item in componentNames"
      v-bind:key="item.link"
      :to="{ path: item.link }"
      custom
      v-slot="{ navigate, isActive }"
    >
      <div class="d-flex button-bar" v-on:click="navigate" v-bind:class="{ 'button-active': isActive }">
        <div class="whitebar" v-if="isActive && isOpen"></div>
        <div
          class="d-flex align-items-center icon-transition"
          v-bind:class="{
            'icon-active': isActive && isOpen,
            'icon-padding-closed': !isOpen,
            'icon-padding-open': isOpen
          }"
        >
          <div class="icon d-flex">
            <component :active="isActive" v-bind:is="item.component"></component>
          </div>
          <div
            v-bind:class="{ 'text-active': isActive, 'text-inactive': !isActive }"
            v-if="isOpen"
            class="text-padding"
          >
            {{ item.title }}
          </div>
        </div>
      </div>
    </router-link>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import { ActiveTab } from '@/utils/ui/enums'
import Playlists from '@/icons/Playlists.vue'
import AllSongs from '@/icons/AllSongs.vue'
import Artists from '@/icons/Artists.vue'
import Fav from '@/icons/Fav.vue'
import Genre from '@/icons/Genre.vue'
import Albums from '@/icons/Albums.vue'
import Toggle from '@/icons/Toggle.vue'
import Rooms from '@/icons/Rooms.vue'
import Explore from '../../../icons/Explore.vue'

@Component({
  components: {
    Playlists,
    AllSongs,
    Artists,
    Fav,
    Genre,
    Albums,
    Toggle,
    Rooms,
    Explore
  }
})
export default class Sidebar extends Vue {
  private componentNames = [
    { component: 'AllSongs', title: 'All Songs', link: '/songs' },
    { component: 'Playlists', title: 'Playlists', link: '/playlists' },
    { component: 'Albums', title: 'Albums', link: '/albums' },
    { component: 'Artists', title: 'Artists', link: '/artists' },
    { component: 'Genre', title: 'Genre', link: '/genre' },
    { component: 'Explore', title: 'Explore', link: '/recommendations' }
    // { component: 'Fav', title: 'Favourites', link: '/favs' }
  ]

  private active: ActiveTab = ActiveTab.ALLSONGS

  @Prop({ default: true })
  private isOpen!: boolean

  private setActive(i: number, navigate: Function): void {
    this.active = i
    navigate(this)
  }
}
</script>

<style lang="sass" scoped>
.icon
  width: 38px
  height: 38px
  align-items: center

.icon-padding-open
  padding: 0.25rem 0rem 0.25rem 1.8rem

.icon-padding-closed
  padding: 0.5rem 0rem 0.25rem 1rem

.icon-transition
  transition: 0.2s

.icon-padding-open.icon-transition:hover
  margin-left: 0.6rem

.text-padding
  padding-left: 2rem
  user-select: none

.button-bar
  margin-top: 1.25rem
  vertical-align: middle

.whitebar
  width: 3px
  height: auto
  background: #FFFFFF

.button-active
  background: linear-gradient(270deg, rgba(55, 60, 66, 0) 0%, #373C42 100%)

.icon-active
  padding-left: calc(1.8rem - 3px)

.text-active
  color: var(--accent)

.text-inactive
  color: var(--textPrimary)
</style>
