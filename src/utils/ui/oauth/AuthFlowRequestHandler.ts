/* 
 *  AuthFlowRequestHandler.ts is a part of Moosync.
 *  
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { AuthorizationError, AuthorizationRequest, AuthorizationRequestHandler, AuthorizationRequestResponse, AuthorizationResponse, AuthorizationServiceConfiguration, BasicQueryStringUtils, Crypto, QueryStringUtils } from "@openid/appauth"

import EventEmitter from 'events'
import { WebCrypto } from "./crypto_utils"

class ServerEventsEmitter extends EventEmitter {
  static ON_AUTHORIZATION_RESPONSE = 'authorization_response'
}

export class AuthFlowRequestHandler extends AuthorizationRequestHandler {
  private authorizationPromise: Promise<AuthorizationRequestResponse | null> | null = null
  private channelID: string

  constructor(
    channel: string,
    utils: QueryStringUtils = new BasicQueryStringUtils(),
    crypto: Crypto = new WebCrypto(),) {
    super(utils, crypto)
    this.channelID = channel
  }


  performAuthorizationRequest(configuration: AuthorizationServiceConfiguration, request: AuthorizationRequest): void {

    const emitter = new ServerEventsEmitter()

    window.WindowUtils.listenOAuth(this.channelID, (data) => {
      const url = new URL(data)

      const searchParams = url.searchParams

      const state = searchParams.get('state') || undefined
      const code = searchParams.get('code')
      const error = searchParams.get('error')

      if (!state && !code && !error) {
        return
      }

      let authorizationResponse: AuthorizationResponse | null = null
      let authorizationError: AuthorizationError | null = null
      if (error) {
        // get additional optional info.
        const errorUri = searchParams.get('error_uri') || undefined
        const errorDescription = searchParams.get('error_description') || undefined
        authorizationError = new AuthorizationError(
          { error: error, error_description: errorDescription!, error_uri: errorUri!, state: state! })
      } else {
        authorizationResponse = new AuthorizationResponse({ code: code!, state: state! })
      }

      const completeResponse = {
        request,
        response: authorizationResponse,
        error: authorizationError
      } as AuthorizationRequestResponse
      emitter.emit(ServerEventsEmitter.ON_AUTHORIZATION_RESPONSE, completeResponse)
    })

    this.authorizationPromise = new Promise<AuthorizationRequestResponse>((resolve) => {
      emitter.once(ServerEventsEmitter.ON_AUTHORIZATION_RESPONSE, (result: AuthorizationRequestResponse) => {
        // resolve pending promise
        resolve(result)
        // complete authorization flow
        this.completeAuthorizationRequestIfPossible()
      })
    })

    window.WindowUtils.openExternal(this.buildRequestUrl(configuration, request))
  }
  protected completeAuthorizationRequest(): Promise<AuthorizationRequestResponse | null> {
    if (!this.authorizationPromise) {
      return Promise.reject(
        'No pending authorization request. Call performAuthorizationRequest() ?')
    }
    return this.authorizationPromise
  }
}