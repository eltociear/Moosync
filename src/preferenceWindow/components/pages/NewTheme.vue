<template>
  <b-container fluid class="h-100">
    <b-row no-gutters> </b-row>
    <b-row no-gutters>
      <b-col cols="auto">
        <PreferenceHeader title="UI" tooltip="UI" />
        <table>
          <ColorPicker
            :defColor="customTheme.primary"
            title="Primary"
            @colorChange="onColorChange('primary', ...arguments)"
          />
          <ColorPicker
            :defColor="customTheme.secondary"
            title="Secondary"
            @colorChange="onColorChange('secondary', ...arguments)"
          />
          <ColorPicker
            :defColor="customTheme.tertiary"
            title="Tertiary"
            @colorChange="onColorChange('tertiary', ...arguments)"
          />
          <ColorPicker
            :defColor="customTheme.accent"
            title="Accent"
            @colorChange="onColorChange('accent', ...arguments)"
          />
          <PreferenceHeader class="mt-5" title="Text" tooltip="Text" />
          <ColorPicker
            :defColor="customTheme.textPrimary"
            title="Primary"
            @colorChange="onColorChange('textPrimary', ...arguments)"
          />
          <ColorPicker
            :defColor="customTheme.textSecondary"
            title="Secondary"
            @colorChange="onColorChange('textSecondary', ...arguments)"
          />
          <ColorPicker
            :defColor="customTheme.textInverse"
            title="Inverse"
            @colorChange="onColorChange('textInverse', ...arguments)"
          />
        </table>
      </b-col>
      <b-col class="h-100">
        <b-row no-gutters class="metadata mb-3">
          <b-input v-model="title" class="theme-title" maxlength="20" placeholder="Theme Name" />
          <b-input v-model="author" class="theme-title" maxlength="20" placeholder="Author" />
        </b-row>
        <b-row no-gutters class="preview mb-5">
          <ThemeComponentClassic :colors="customTheme" :id="getRandomID()" />
        </b-row>
        <b-row no-gutters class="preview">
          <ThemeComponentCompact class="h-100" :colors="customTheme" :id="getRandomID()" />
        </b-row>
      </b-col>
    </b-row>
    <b-row class="mt-5 mr-5" align-h="end">
      <b-button class="cancel-button mr-4" @click="dismiss">Cancel</b-button>
      <b-button class="confirm-button" @click="saveTheme">Save</b-button>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Component, Prop, Watch } from 'vue-property-decorator'
import Vue from 'vue'
import ThemeComponentClassic from '../ThemeComponentClassic.vue'
import { v1 } from 'uuid'
import PreferenceHeader from '../PreferenceHeader.vue'
import ThemeComponentCompact from '../ThemeComponentCompact.vue'
import ColorPicker from '../ColorPicker.vue'
import NavBack from '@/icons/NavBack.vue'

@Component({
  components: {
    ThemeComponentClassic,
    ThemeComponentCompact,
    PreferenceHeader,
    ColorPicker,
    NavBack
  }
})
export default class NewTheme extends Vue {
  private customTheme: ThemeItem = this.defaultTheme

  private title: string = ''
  private author: string = ''

  @Prop()
  private currentTheme!: ThemeItem

  get defaultTheme() {
    return {
      primary: '#212121',
      secondary: '#282828',
      tertiary: '#151515',
      textPrimary: '#ffffff',
      textSecondary: '#565656',
      textInverse: '#000000',
      accent: '#65CB88',
      divider: 'rgba(79, 79, 79, 0.67)'
    }
  }

  private onColorChange(attr: ThemeKey, color: string) {
    this.$set(this.customTheme, attr, color)
  }

  private getRandomID() {
    return v1()
  }

  private generateThemeMetadata(): ThemeDetails {
    return {
      id: v1(),
      name: this.title,
      author: this.author,
      theme: this.customTheme
    }
  }

  private dismiss() {
    this.$router.push({
      name: 'themes'
    })
  }

  private saveTheme() {
    window.ThemeUtils.saveTheme(this.generateThemeMetadata())
    this.dismiss()
  }

  private async parseClipboard() {
    const text = await navigator.clipboard.readText()
    const parsed: ThemeDetails = JSON.parse(text)
    if (parsed.name && parsed.author && parsed.theme) {
      for (const key of Object.keys(parsed.theme)) {
        if (parsed.theme[key as keyof ThemeItem]) {
          const color = parsed.theme[key as keyof ThemeItem]
          if (color.length === 7 && color.startsWith('#')) {
            continue
          }
          parsed.theme[key as keyof ThemeItem] = this.defaultTheme[key as keyof ThemeItem]
        }
      }
      this.customTheme = parsed.theme
      this.title = parsed.name
      this.author = parsed.author
    }
  }

  created() {
    if (this.currentTheme) {
      this.customTheme = this.currentTheme
    }
    this.parseClipboard()
  }
}
</script>

<style lang="sass">
.metadata
  margin-left: 151px
  @media (max-width: 1360px)
    margin-left: 100px
  @media (max-width: 900px)
    margin-left: 80px !important

.preview
  margin-left: 151px
  width: 600px

.preview
  @media (max-width: 1360px)
    margin-left: 100px
    width: 500px
  @media (max-width: 1260px)
    width: 400px
  @media (max-width: 1160px)
    display: none !important

.theme-title
  font-size: 18px
  max-width: 100%
  margin-bottom: 15px !important
  color: var(--textPrimary) !important
  background-color: transparent !important
  border: 0
  border-bottom: 1px solid transparent
  border-radius: 0
  padding: 0
  &:hover
    border-bottom: 1px solid var(--accent)
  &:focus
    outline: none
    -webkit-box-shadow: none
</style>