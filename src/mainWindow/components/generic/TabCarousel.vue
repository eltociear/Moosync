<!-- 
  TabCarousel.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-row no-gutters>
    <b-col class="song-header-options w-100">
      <b-row no-gutters align-v="center" class="h-100">
        <b-col cols="auto" class="mr-3" v-if="optionalProviders.length > 0 && showPrevIcon">
          <PrevIcon @click.native="onPrevClick" />
        </b-col>
        <b-col class="provider-outer-container" v-if="optionalProviders.length > 0">
          <div ref="gradientContainer" class="gradient-overlay" :style="{ background: computedGradient }"></div>
          <div ref="providersContainer" class="provider-container d-flex">
            <div
              v-for="provider in optionalProviders"
              cols="auto"
              class="`h-100 item-checkbox-col mr-2"
              :key="provider.key"
              @click="onProviderSelected(provider.key)"
            >
              <div
                class="h-100 d-flex item-checkbox-container"
                :style="{
                  background: `${
                    selectedProviders.includes(provider.key) ? 'var(--textSecondary)' : 'var(--secondary)'
                  }`
                }"
              >
                <span class="align-self-center">{{ provider.title }}</span>
              </div>
            </div>
          </div>
        </b-col>
        <b-col cols="auto" class="ml-3 mr-3" v-if="optionalProviders.length > 0">
          <NextIcon @click.native="onNextClick" v-if="showNextIcon" />
        </b-col>
        <b-col cols="auto" class="ml-auto d-flex" ref="buttonGroupContainer">
          <div v-if="showSearchbar" class="searchbar-container mr-3">
            <b-form-input
              v-model="searchText"
              class="searchbar"
              placeholder="Search..."
              type="text"
              @update="onSearchChange"
            />
          </div>
          <SearchIcon @click.native="toggleSearch" :accent="false" class="mr-3 align-self-center" />
          <SortIcon v-if="isSortAsc" @click.native="showSortMenu" class="align-self-center" />
          <SortIconAlt v-else @click.native="showSortMenu" class="align-self-center" />
        </b-col>
      </b-row>
    </b-col>
  </b-row>
</template>

<script lang="ts">
import { mixins } from 'vue-class-component'
import { Component, Prop, Ref } from 'vue-property-decorator'
import ContextMenuMixin from '@/utils/ui/mixins/ContextMenuMixin'
import SortIcon from '@/icons/SortIcon.vue'
import SortIconAlt from '@/icons/SortIconAlt.vue'

import SearchIcon from '@/icons/SearchIcon.vue'
import NextIcon from '@/icons/NavForwardIcon.vue'
import PrevIcon from '@/icons/NavBackIcon.vue'
import { vxm } from '@/mainWindow/store'

@Component({
  components: {
    SortIcon,
    SortIconAlt,
    SearchIcon,
    NextIcon,
    PrevIcon
  }
})
export default class TabCarousel extends mixins(ContextMenuMixin) {
  @Prop({ default: () => [] })
  private optionalProviders!: ProviderHeaderOptions[]

  @Ref('providersContainer')
  private providerContainer!: HTMLDivElement

  @Ref('gradientContainer')
  private gradientContainer!: HTMLDivElement

  @Ref('buttonGroupContainer')
  private buttonGroupContainer!: HTMLDivElement

  private scrollLeft = 0
  private containerSize = 0

  private selectedProviders: string[] = []

  private showSearchbar = false
  private searchText = ''

  private get showNextIcon() {
    return this.scrollLeft + this.containerSize < this.providerContainer?.scrollWidth
  }

  private get showPrevIcon() {
    return this.providerContainer?.scrollWidth > this.containerSize && this.scrollLeft > 0
  }

  private get isSortAsc() {
    return vxm.themes.songSortBy.asc
  }

  private onProviderSelected(key: string) {
    const isSelected = this.selectedProviders.findIndex((val) => val === key)
    if (isSelected === -1) {
      this.selectedProviders.push(key)
    } else {
      this.selectedProviders.splice(isSelected, 1)
    }

    this.$emit('onOptionalProviderChanged', { key, checked: isSelected === -1 })
  }

  private showSortMenu(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()
    this.$emit(
      'onSortClicked',
      new PointerEvent('click', {
        clientX: event.pageX,
        clientY: this.buttonGroupContainer.getBoundingClientRect().top + this.buttonGroupContainer.clientHeight + 10
      })
    )
  }

  private toggleSearch() {
    this.showSearchbar = !this.showSearchbar
  }

  private onSearchChange() {
    this.$emit('onSearchChange', this.searchText)
  }

  mounted() {
    if (this.providerContainer && this.gradientContainer) {
      const scrollProviders = (e: WheelEvent) => {
        if (e.deltaY > 0) this.providerContainer.scrollTo({ left: this.providerContainer.scrollLeft + 20 })
        else this.providerContainer.scrollTo({ left: this.providerContainer.scrollLeft - 20 })
        this.scrollLeft = this.providerContainer.scrollLeft
      }

      this.providerContainer.onwheel = scrollProviders.bind(this)
      this.gradientContainer.onwheel = scrollProviders.bind(this)

      new ResizeObserver((e) => (this.containerSize = e[0].target.clientWidth)).observe(this.providerContainer)
    }
  }

  private get computedGradient() {
    return `linear-gradient(90deg, var(--primary) 0% , rgba(255,255,255,0) ${
      this.showPrevIcon ? '10%' : '0%'
    }, rgba(255,255,255,0) ${this.showNextIcon ? '90%' : '100%'}, var(--primary) 100%)`
  }

  private onNextClick() {
    const scrollLeft = this.providerContainer.scrollLeft + 100
    this.providerContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' })
    this.scrollLeft = scrollLeft
  }

  private onPrevClick() {
    const scrollLeft = this.providerContainer.scrollLeft - 100
    this.providerContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' })
    this.scrollLeft = scrollLeft
  }
}
</script>

<style lang="sass">
.custom-dropdown
  background-color: transparent !important
  border-color: transparent !important
  box-shadow: none !important

.provider-container::-webkit-scrollbar-thumb
  display: none

.provider-container::-webkit-scrollbar
  display: none
</style>

<style lang="sass" scoped>
.song-header-options
  height: 40px
  border-radius: 10px
  margin-bottom: 13px

.item-checkbox-container
  border-radius: 8px
  padding-top: 3px
  padding-bottom: 3px
  padding-left: 15px
  padding-right: 15px

.provider-container
  transition: all 0.3s ease-out
  overflow-x: auto
  min-width: 10%

.gradient-overlay
  position: absolute
  width: 100%
  pointer-events: none
  height: 100%

.provider-outer-container
  min-width: 10%

.searchbar
  color: var(--textPrimary) !important
  background: var(--tertiary)
  border: none
  border-radius: 15px
  height: 100%
  transition: background 0.3s cubic-bezier(0.39, 0.58, 0.57, 1), border-radius 1000ms
  text-align: left
  box-shadow: none
  &::-webkit-input-placeholder
    color: var(--textSecondary)
  &:focus
    background: var(--tertiary) !important
    outline: 0
</style>
