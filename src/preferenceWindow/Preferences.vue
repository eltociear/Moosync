<!-- 
  Preferences.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div id="app">
    <Titlebar windowType="preference-window" />
    <Sidebar />
    <div class="main-content">
      <transition
        appear
        name="custom-slide-fade"
        enter-active-class="animate__animated animate__slideInLeft animate__fast"
        leave-active-class="animate__animated animate__slideOutRight animate__fast"
      >
        <router-view class="animate_absolute"></router-view>
      </transition>
    </div>
  </div>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator'
import Titlebar from '@/commonComponents/Titlebar.vue'
import { mixins } from 'vue-class-component'
import ThemeHandler from '@/utils/ui/mixins/ThemeHandler'
import Sidebar from '@/preferenceWindow/components/Sidebar.vue'
import Vue from 'vue'
import { i18n } from '@/preferenceWindow/plugins/i18n'

Vue.directive('click-outside', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bind: function (el: any, binding) {
    // Define Handler and cache it on the element
    const bubble = binding.modifiers.bubble
    const handler = (e: Event) => {
      if (bubble || (!el.contains(e.target) && el !== e.target)) {
        binding.value(e)
      }
    }
    el.__vueClickOutside__ = handler
    // add Event Listeners
    document.addEventListener('mousedown', handler)
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unbind: function (el: any) {
    // Remove Event Listeners
    document.removeEventListener('mousedown', el.__vueClickOutside__)
    el.__vueClickOutside__ = null
  }
})

@Component({
  components: {
    Titlebar,
    Sidebar
  }
})
export default class App extends mixins(ThemeHandler) {
  mounted() {
    this.getLanguage()
    this.$root.$on('themeChanged', this.fetchThemeFromID)
    this.registerDevTools()
    this.listenArgs()
  }

  private async getLanguage() {
    const langs = await window.PreferenceUtils.loadSelective<CheckboxValue>('system_language')
    const active = (langs ?? []).find((val) => val.enabled)
    if (active) {
      i18n.locale = active?.key
    }
  }

  private listenArgs() {
    window.WindowUtils.listenArgs((args) => {
      if (args && (args as { page: string }).page) {
        this.$router.push((args as { page: string }).page)
      }
    })
  }

  private registerDevTools() {
    document.addEventListener('keydown', function (e) {
      if (e.code === 'F12') {
        window.WindowUtils.toggleDevTools(false)
      } else if (e.code === 'F5') {
        location.reload()
      }
    })
  }

  private closeWindow() {
    window.WindowUtils.closeWindow(false)
  }
}
</script>

<style>
#app {
  font-family: 'Nunito Sans';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  background: var(--primary);
  color: var(--textPrimary);
  width: 100%;
  height: 100%;
  /* margin-top: 60px */
}

body {
  background-color: var(--primary) !important;
  color: var(--textPrimary) !important;
}

.footer-buttons {
  position: absolute;
  bottom: 0;
  right: 0;
}
</style>

<style lang="sass">
.slide-fade-enter-active
  transition: all .3s ease

.slide-fade-leave-active
  transition: all .2s ease
.slide-fade-enter, .slide-fade-leave-to
  transform: translateY(100px)
  opacity: 0

*::-webkit-scrollbar,
*::-webkit-scrollbar-thumb
  width: 26px
  border-radius: 13px
  background-clip: padding-box
  border: 10px solid transparent

*::-webkit-scrollbar-thumb
  box-shadow: inset 0 0 0 10px
  min-height: 40px

*::-webkit-scrollbar-track
  background: transparent
</style>

<style lang="sass" scoped>
.main-content
  position: absolute
  left: calc(261px + 30px)
  height: calc(100% - 30px - 70px)
  top: calc(70px)
  right: 0
  bottom: calc(30px)
  overflow-y: scroll
  overflow-x: hidden
  z-index: -4
  transition: 0.2s
</style>
