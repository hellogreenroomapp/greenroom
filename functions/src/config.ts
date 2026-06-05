export const KLAVIYO_AUTHORIZE_URL = 'https://www.klaviyo.com/oauth/authorize'
export const KLAVIYO_TOKEN_URL = 'https://a.klaviyo.com/oauth/token'
export const KLAVIYO_REVOKE_URL = 'https://a.klaviyo.com/oauth/revoke'
export const KLAVIYO_API_BASE = 'https://a.klaviyo.com/api'
/** Klaviyo API revision header — update when upgrading API version */
export const KLAVIYO_API_REVISION = '2024-10-15'

/** Only scopes GreenRoom is allowed to request — read-only, no writes to Klaviyo. */
export const KLAVIYO_READ_ONLY_SCOPES = ['campaigns:read'] as const
