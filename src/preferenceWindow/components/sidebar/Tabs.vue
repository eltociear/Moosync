<!-- 
  Tabs.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

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
        <div
          class="whitebar"
          v-bind:class="{
            'whitebar-active': isActive
          }"
          v-if="isActive"
        ></div>
        <div
          class="d-flex align-items-center icon-transition icon-padding-open"
          v-bind:class="{
            'icon-active': isActive
          }"
        >
          <div class="icon">
            <component :active="isActive" v-bind:is="item.component"></component>
          </div>
          <div
            class="text-padding text-format"
            v-bind:class="{
              'text-active': isActive
            }"
          >
            {{ item.title }}
          </div>
        </div>
      </div>
    </router-link>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import Extensions from '@/icons/ExtensionsIcon.vue'
import Paths from '@/icons/PathsIcon.vue'
import System from '@/icons/SystemIcon.vue'
import Themes from '@/icons/ThemesIcon.vue'

@Component({
  components: {
    Extensions,
    Paths,
    System,
    Themes
  }
})
export default class Sidebar extends Vue {
  private componentNames = [
    { component: 'Paths', title: 'Paths', link: '/paths' },
    { component: 'Themes', title: 'Themes', link: '/themes' },
    { component: 'Extensions', title: 'Extensions', link: '/extensions' },
    { component: 'System', title: 'System', link: '/system' }
  ]
}
</script>

<style lang="sass" scoped>
.icon
  width: 38px
  height: 38px
  display: flex
  align-items: center

.icon-padding-open
  padding: 0.25rem 0rem 0.25rem 1.8rem

.icon-padding-closed
  padding: 0.5rem 0rem 0.25rem 1rem

.icon-transition
  transition: 0.1s

.icon-padding-open.icon-transition:hover
  margin-left: 0.6rem

.text-padding
  padding-left: 2rem
  user-select: none

.text-format
  color: var(--textPrimary)

.text-active
  color: var(--accent)

.button-bar
  margin-top: 1.25rem
  vertical-align: middle

.whitebar
  width: 3px
  height: auto
  background: var(--textPrimary)

.whitebar-active
  background: var(--accent)

.button-active
  background: linear-gradient(270deg, rgba(var(--secondary-rgb), 0) 0%, rgba(var(--accent-rgb), 0.22) 100%)

.icon-active
  padding-left: calc(1.8rem - 3px)
</style>
