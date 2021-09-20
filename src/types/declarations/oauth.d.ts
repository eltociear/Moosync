/* 
 *  oauth.d.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

type oauthType = 'youtube' | 'spotify'
type config = { type: oauthType, openIdConnectUrl: string, clientId: string, redirectUri: string, scope: string, keytarService: string, oAuthChannel: string }