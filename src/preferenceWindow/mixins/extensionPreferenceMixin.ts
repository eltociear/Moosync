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
  public defaultValue!: string

  @Prop()
  public prefKey?: string

  @Prop({ default: false })
  public isExtension!: boolean

  @Prop({ default: v1() })
  public packageName!: string

  public value: unknown = ''

  public loading = false

  mounted() {
    if (this.prefKey) {
      this.loading = true
      window.PreferenceUtils.loadSelective(this.prefKey, this.isExtension)
        .then((val) => {
          if (typeof val === 'object' && typeof this.defaultValue === 'object') {
            this.value = Object.assign(this.defaultValue, val)
          } else {
            this.value = (val as string) ?? this.defaultValue
          }
        })
        .then(() => (this.loading = false))
    }
  }

  public onInputChange() {
    this.prefKey && window.PreferenceUtils.saveSelective(this.prefKey, this.value, this.isExtension)

    if (this.isExtension)
      window.ExtensionUtils.sendEvent({
        data: { key: this.prefKey, value: this.value },
        type: 'onPreferenceChanged',
        packageName: this.packageName
      } as extensionEventMessage)
    else this.prefKey && window.PreferenceUtils.notifyPreferenceChanged(this.prefKey, this.value)
  }
}
