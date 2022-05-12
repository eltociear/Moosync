<!-- 
  System.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div class="w-100 h-100">
    <div class="logger-bg h-100">
      <div class="controls w-100 d-flex" no-gutters>
        <b-dropdown :text="capitalizeFirstLetter(levelFilter)" variant="success" class="m-2">
          <b-dropdown-item @click="logLevelChange('ALL')">All</b-dropdown-item>
          <b-dropdown-item @click="logLevelChange('DEBUG')">Debug</b-dropdown-item>
          <b-dropdown-item @click="logLevelChange('INFO')">Info</b-dropdown-item>
          <b-dropdown-item @click="logLevelChange('WARN')">Warn</b-dropdown-item>
          <b-dropdown-item @click="logLevelChange('ERROR')">Error</b-dropdown-item>
        </b-dropdown>
        <b-dropdown :text="processFilter" variant="success" class="m-2">
          <b-dropdown-item v-for="process in processFilters" :key="process" @click="processFilterChange(process)">{{
            process
          }}</b-dropdown-item>
        </b-dropdown>
        <b-input class="align-self-center search-field" debounce="300" v-model="searchFilter"></b-input>
      </div>
      <div class="log-content w-100" no-gutters>
        <b-table
          :filter-function="handleFilter"
          hover
          dark
          sticky-header
          :items="logLines"
          :fields="fields"
          :filter="filterCriteria"
          :perPage="perPage"
          :current-page="currentPage"
          id="logs-table"
          class="log-table"
          @filtered="onFiltered"
        >
          <template #cell(time)="data">
            <div :class="`time-col ${data.item.level.toLowerCase()}`">
              {{ data.item.time }}
            </div>
          </template>

          <template #cell(level)="data">
            <div :class="`level-col ${data.item.level.toLowerCase()}`">
              {{ data.item.level }}
            </div>
          </template>

          <template #cell(process)="data">
            <div :class="`process-col ${data.item.level.toLowerCase()}`">
              {{ data.item.process }}
            </div>
          </template>

          <template #cell(message)="data">
            <div class="message-col">
              <pre :class="data.item.level.toLowerCase()">{{ data.item.message }}</pre>
            </div>
          </template>
        </b-table>
      </div>
      <b-pagination
        v-model="currentPage"
        :total-rows="totalRows"
        :per-page="perPage"
        aria-controls="logs-table"
        class="pagination"
      ></b-pagination>
    </div>
  </div>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator'
import Vue from 'vue'

type LogLines = {
  index: number
  time: string
  level: LogLevels
  process: string
  message: string
}

type LogPrevLine = {
  prev: string
}

type LogLevels = 'ALL' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

@Component({
  components: {}
})
export default class Logs extends Vue {
  private logLines: LogLines[] = []

  private levelFilter: LogLevels = 'ALL'
  private processFilter = 'All'
  private possibleProcessFilters: { [key: string]: boolean } = {
    Main: true,
    Renderer: true,
    'Extension Host': true
  }

  private searchFilter = ''

  private perPage = 50
  private currentPage = 1
  private totalRows = this.logLines.length

  private get processFilters() {
    return Object.keys(this.possibleProcessFilters)
  }

  private filterCriteria = 'key'

  private fields = [{ key: 'time', sortable: true }, 'level', 'process', 'message']

  private handleFilter(val: LogLines) {
    const currentLogLevel = this.getLogLevel(this.levelFilter)
    const itemLogLevel = this.getLogLevel(val.level)

    if (itemLogLevel < currentLogLevel) {
      return false
    }

    if (this.processFilter !== 'All' && val.process !== this.processFilter) {
      return false
    }

    if (this.searchFilter && !val.message.includes(this.searchFilter)) {
      return false
    }

    return true
  }

  private getLogLevel(level: LogLevels) {
    switch (level) {
      case 'ERROR':
        return 5
      case 'WARN':
        return 4
      case 'INFO':
        return 3
      case 'DEBUG':
        return 2
      case 'ALL':
        return 1
    }
  }

  private processFilterChange(name: string) {
    this.processFilter = name
  }

  private logLevelChange(level: LogLevels) {
    this.levelFilter = level
  }

  private onFiltered(filteredItems: LogLines[]) {
    this.totalRows = filteredItems.length
  }

  mounted() {
    let tmpData: LogLines[] = []
    let timer: ReturnType<typeof setTimeout>
    // This timer ensures that animation plays without lag
    setTimeout(() => {
      window.LoggerUtils.watchLogs((data) => {
        if (data) {
          if ((data as LogPrevLine).prev) {
            if (tmpData[tmpData.length - 1]) {
              tmpData[tmpData.length - 1].message += '\n' + (data as LogPrevLine).prev
            } else {
              this.logLines[this.logLines.length - 1].message += '\n' + (data as LogPrevLine).prev
            }
          } else {
            if ((data as LogLines).message) {
              tmpData.push({ ...(data as LogLines), index: this.logLines.length })
              Vue.set(this.possibleProcessFilters, (data as LogLines).process, true)
            }
          }
          if (timer) {
            clearTimeout(timer)
          }
          if (tmpData.length > 10) {
            this.logLines.push(...tmpData)
            this.totalRows = this.logLines.length
            tmpData = []
            return
          }
          // Without timer spam push into logLines causes b-table to quickly react to so many changes
          timer = setTimeout(() => {
            this.logLines.push(...tmpData)
            this.totalRows = this.logLines.length
            tmpData = []
          }, 100)
        }
      })
    }, 1000)
  }

  beforeDestroy() {
    window.LoggerUtils.unwatchLogs()
  }

  private capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.toLowerCase().slice(1)
  }
}
</script>

<style lang="sass">
.table
  background-color: var(--tertiary) !important
  thead
    tr
      th
        position: sticky !important
        border-top: none
        text-align: left

td
  text-align: left

.bg-b-table-default
  background-color: var(--tertiary) !important

.message-col
  word-break: break-word
  max-width: 600px
  pre
    color: white
    font-family: 'Nunito Sans'
    font-size: 16px
    white-space: pre-wrap
</style>

<style lang="sass" scoped>
.logger-bg
  background: var(--tertiary)

.log-content
  height: calc( 100% - 120px )

.log-table
  max-height: 100% !important
  color: white !important

.search-field
  margin-left: 8px
  width: 300px

.pagination
  margin-top: 15px
  justify-content: center

.debug
  color: #29B8DB

.info
  color: #2E80EA

.warn
  color: #F5F543

.error
  color: #F04538
</style>
