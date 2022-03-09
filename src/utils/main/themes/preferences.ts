import { saveSelectivePreference, loadSelectivePreference, store } from '../db/preferences';
import { SystemThemeHandler } from './system';

/**
 * Saves theme under key "themes"
 * @param theme details of theme to save
 */
export function saveTheme(theme: ThemeDetails) {
  store.set(`themes.${theme.id}`, theme)
}

/**
 * Removes theme by id
 * @param id of theme
 */
export function removeTheme(id: string) {
  store.delete(`themes.${id}` as any)
}

/**
 * Fetches theme by id
 * @param id of theme
 * @returns details of theme if found otherwise undefined
 */
export function loadTheme(id: string): ThemeDetails | undefined {
  return store.get(`themes.${id}`) as ThemeDetails | undefined
}

/**
 * Fetches all themes
 * @returns Dictionary of themes with their id's as keys
 */
export function loadAllThemes(): { [key: string]: ThemeDetails } | undefined {
  return store.get(`themes`) as { [key: string]: ThemeDetails } | undefined
}

/**
 * Sets active theme by id
 * @param id of theme 
 */
export function setActiveTheme(id: string) {
  saveSelectivePreference('activeTheme', id, false)
}

/**
 * Sets song view to active
 * @param menu to be set active
 */
export function setSongView(menu: songMenu) {
  saveSelectivePreference('songView', menu, false)
}

/**
 * Gets active song view
 * @returns song view if active otherwise compact
 */
export function getSongView(): songMenu {
  return loadSelectivePreference('songView', false, 'compact' as songMenu) ?? 'compact'
}

/**
 * Gets active theme
 * @returns details of active theme if exists otherwise undefined 
 */
export function getActiveTheme() {
  const id = loadSelectivePreference('activeTheme', false) as string
  if (id) {
    return loadTheme(id)
  }
}

export async function setupSystemThemes() {
  const themes: { [key: string]: ThemeDetails } = {}

  const systemThemeHandler = new SystemThemeHandler()
  if (process.platform === 'linux') {
    console.log('execing')
    const theme = await systemThemeHandler.getLinuxStyle()
    if (theme) {
      themes[theme.id] = theme
    }

    for (const key in themes) {
      saveTheme(themes[key])
    }
  }
}

/**
 * Setups default themes
 */
export function setupDefaultThemes() {
  const themes: { [key: string]: ThemeDetails } = {
    '809b7310-f852-11eb-82e2-0985b6365ce4': {
      id: "809b7310-f852-11eb-82e2-0985b6365ce4",
      name: "Fluid",
      author: "Androbuddy",
      theme: {
        primary: "#202125",
        secondary: "#2D2F36",
        tertiary: "#27292E",
        textPrimary: "#FFFFFF",
        textSecondary: "rgba(255, 255, 255, 0.32)",
        textInverse: "#000000",
        accent: "#72BBFF",
        divider: "rgba(79, 79, 79, 0.67)"
      }
    }
  }

  for (const key in themes) {
    if (!store.has(`themes.${key}`)) {
      saveTheme(themes[key])
    }
  }
}
