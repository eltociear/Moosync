<template>
  <ContextMenu ref="contextMenu" v-click-outside="hideContextMenu" :menu-items="menu" />
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator'
import Vue from 'vue'
import { bus } from '@/mainWindow/main'
import { EventBus } from '@/utils/main/ipc/constants'
import 'vue-context-menu-popup/dist/vue-context-menu-popup.css'
import ContextMenu from 'vue-context-menu-popup'
import { ContextMenuComponent, MenuItem } from 'vue-context-menu-popup'

Vue.directive('click-outside', {
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
  unbind: function (el: any) {
    // Remove Event Listeners
    document.removeEventListener('mousedown', el.__vueClickOutside__)
    el.__vueClickOutside__ = null
  }
})

@Component({
  components: {
    ContextMenu
  }
})
export default class Context extends Vue {
  private menu: MenuItem[] = []
  mounted() {
    bus.$on(EventBus.SHOW_CONTEXT, (event: Event, items: MenuItem[]) => {
      this.menu = items
      ;(this.$refs.contextMenu as ContextMenuComponent).open(event)
    })
  }

  private hideContextMenu() {
    null
    ;(this.$refs.contextMenu as ContextMenuComponent).close()
  }
}
</script>

<style lang="sass">
.context-menu
  background: var(--secondary)
  ul li
    &:hover
      background: var(--accent)
</style>
