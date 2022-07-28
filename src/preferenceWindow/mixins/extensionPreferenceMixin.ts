/*
 *  extensionPreferenceMixin.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { Component, Prop, Vue } from 'vue-property-decorator'

import { v1 } from 'uuid'

@Component
export class ExtensionPreferenceMixin extends Vue {
  @Prop({ default: '' })
  public defaultValue!: unknown

  @Prop()
  public prefKey?: string

  @Prop({ default: false })
  public isExtension!: boolean

  @Prop({ default: v1() })
  public packageName!: string

  @Prop({ default: () => null })
  private onValueFetch!: (val: unknown) => void

  @Prop({ default: () => null })
  private onValueChange!: (val: unknown) => void

  @Prop({ default: 'text' })
  private type!: string

  public value: unknown = ''

  public loading = false

  protected postFetch: (() => void) | undefined

  private onValueChanged() {
    this.onValueChange && this.onValueChange(this.value)
  }

  mounted() {
    this.fetch()
    this.registerPreferenceListener()
  }

  private fetch() {
    if (this.prefKey) {
      this.loading = true
      ;(this.type === 'password'
        ? window.Store.getSecure(this.prefKey)
        : window.PreferenceUtils.loadSelective(this.prefKey, this.isExtension)
      )
        .then((val) => {
          if (this.type === 'password') {
            val = val && JSON.parse(val as string)
          }

          if (typeof val === 'object' && typeof this.defaultValue === 'object') {
            if (Array.isArray(this.defaultValue)) {
              this.value = Object.assign([], this.defaultValue, val)
            } else {
              this.value = Object.assign({}, this.defaultValue, val)
            }
          } else {
            this.value = (val as string) ?? this.defaultValue
          }
        })
        .then(() => (this.loading = false))
        .then(() => this.postFetch && this.postFetch())
        .then(() => this.onValueFetch && this.onValueFetch(this.value))
    }
  }

  private registerPreferenceListener() {
    window.PreferenceUtils.listenPreferenceChange((...[key]) => {
      if (typeof key === 'string') {
        if (this.prefKey === key) {
          this.fetch()
        }
      }
    })
  }

  public onInputChange() {
    if (this.prefKey) {
      if (this.type === 'password') {
        window.Store.setSecure(this.prefKey, JSON.stringify(this.value))
      } else {
        window.PreferenceUtils.saveSelective(this.prefKey, this.value, this.isExtension)
      }

      if (this.isExtension)
        window.ExtensionUtils.sendEvent({
          data: [{ key: this.prefKey.replace(`${this.packageName}.`, ''), value: this.value }],
          type: 'preferenceChanged',
          packageName: this.packageName
        })
      else window.PreferenceUtils.notifyPreferenceChanged(this.prefKey, this.value)

      this.onValueChange && this.onValueChange(this.value)
    }
  }
}
