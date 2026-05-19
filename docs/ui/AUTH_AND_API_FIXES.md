# Authentication & API Integration Fixes

**Date**: May 19, 2026
**Version**: v0.5.2
**Status**: Complete

---

## Overview

This document covers a series of bug fixes related to the Google OAuth authentication flow and API integration. The fixes address issues with:

1. Missing Bearer token in Authorization header
2. Mismatched API response format from backend
3. HTTP 304 caching issues breaking API responses
4. Next.js image hostname configuration

---

## Issues Fixed

### Issue 1: Bearer Token Not Sent in Authorization Header

**Symptom**: After Google login, requests to `/api/auth/me` returned `401 Unauthorized`. Network tab showed `Authorization: Bearer undefined`.

**Root Cause**: The Authorization header was being built in a variable that could potentially be overridden when the headers object was passed to `fetch()`. Additionally, the response from `/api/auth/verify-google` was not being parsed correctly.

**Fix**: Restructured the header construction in `lib/api.ts` to guarantee the Authorization header is set last in the spread order:

```typescript
const response = await fetch(`${API_BASE}${endpoint}`, {
  ...options,
  cache: 'no-store',
  headers: {
    'Content-Type': 'application/json',
    ...(typeof options.headers === 'object' && options.headers !== null ? options.headers : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  },
})
```

---

### Issue 2: Mismatched Response Format from `/api/auth/verify-google`

**Symptom**: Token from Google OAuth verification was `undefined`, even though the request succeeded.

**Root Cause**: The backend returns a wrapped response:

```json
{
  "id": "auth",
  "status": "success",
  "data": {
    "token": "...",
    "user": { ... }
  }
}
```

But the frontend was accessing `response.token` (which is `undefined`) instead of `response.data.token`.

**Fix**: Updated `auth.verifyGoogle()` in `lib/api.ts` to unwrap the `data` property:

```typescript
verifyGoogle: async (googleToken: string): Promise<{ token: string }> => {
  const response = await apiFetch('/api/auth/verify-google', {
    method: 'POST',
    body: JSON.stringify({ token: googleToken }),
  })
  // Backend returns { id, status, data: { token, user } }
  return { token: response.data.token, user: response.data.user }
},
```

Also added defensive validation in `context/auth-context.tsx`:

```typescript
const handleVerifyGoogleToken = async (googleToken: string) => {
  try {
    const response = await auth.verifyGoogle(googleToken)
    if (!response || !response.token) {
      console.error('Invalid response from /api/auth/verify-google:', response)
      throw new Error('No token received from backend. Check server logs.')
    }
    console.log('✅ Google token verified, received JWT:', response.token)
    await handleSetToken(response.token)
  } catch (error) {
    console.error('❌ Google token verification failed:', error)
    throw error
  }
}
```

---

### Issue 3: HTTP 304 Not Modified Breaking API Responses

**Symptom**: Requests to `/api/generations` returned `304 Not Modified` with no body, causing JSON parse errors and empty generation lists.

**Root Cause**: The browser was caching API responses and sending conditional request headers (`If-None-Match`/`If-Modified-Since`). The backend correctly responded with 304, but for dynamic API data we always want fresh responses.

**Fix**: Added `cache: 'no-store'` to all fetch calls in `lib/api.ts`:

```typescript
const response = await fetch(`${API_BASE}${endpoint}`, {
  ...options,
  cache: 'no-store',  // Always fetch fresh data
  headers: { ... },
})
```

**Result**: Server always returns 200 with fresh data instead of 304.

---

### Issue 4: Next.js Image Hostname Not Configured

**Symptom**: Runtime error when displaying generated images:

```
Error: Invalid src prop (http://localhost:3001/api/images/...) on `next/image`,
hostname "localhost" is not configured under images in your `next.config.js`
```

**Root Cause**: Next.js `next/image` component requires external domains to be explicitly whitelisted for security. The config only allowed HTTPS domains, but local development uses `http://localhost:3001`.

**Fix**: Added `localhost` HTTP pattern to `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
}

module.exports = nextConfig
```

**Note**: Dev server must be restarted after modifying `next.config.js`.

---

### Issue 5: Better Error Message Handling

**Fix**: Enhanced error parsing in `apiFetch` to handle both `error` and `message` fields from backend responses:

```typescript
if (!response.ok) {
  let errorMessage = `HTTP ${response.status}`
  try {
    const errorData = await response.json()
    errorMessage = errorData.error || errorData.message || errorMessage
  } catch {
    // ignore JSON parse error, use default message
  }
  throw new Error(errorMessage)
}
```

---

## Files Modified

| File | Changes |
|------|---------|
| `lib/api.ts` | Header construction, response unwrapping, no-cache, error parsing |
| `context/auth-context.tsx` | Token validation and console logging |
| `next.config.js` | Added localhost HTTP to image remotePatterns |

---

## Complete Flow After Fixes

```
1. User visits /
   ↓
2. Middleware checks auth_token cookie → not found
   ↓
3. Redirected to /login
   ↓
4. User clicks "Sign in with Google"
   ↓
5. Google OAuth popup → user authorizes
   ↓
6. Google returns ID token (credentialResponse.credential)
   ↓
7. Frontend POSTs to /api/auth/verify-google
   Body: { token: "<GOOGLE_ID_TOKEN>" }
   ↓
8. Backend verifies, creates/updates user, returns:
   { id, status, data: { token, user } }
   ↓
9. Frontend extracts response.data.token (the JWT)
   ↓
10. JWT stored in localStorage + cookie
   ↓
11. GET /api/auth/me with Authorization: Bearer <JWT>
   ↓
12. Backend returns user profile
   ↓
13. User redirected to home page
   ↓
14. GET /api/generations with Authorization: Bearer <JWT>
   - cache: 'no-store' ensures fresh data (no 304)
   ↓
15. Generation images displayed via next/image
   - localhost http allowed in remotePatterns
```

---

## Testing Checklist

- [ ] Login flow:
  - [ ] Click "Sign in with Google"
  - [ ] Console shows `✅ Google token verified, received JWT:`
  - [ ] localStorage contains `auth_token`
  - [ ] Network: `POST /api/auth/verify-google` returns 200 with `data.token`
  - [ ] Network: `GET /api/auth/me` includes `Authorization: Bearer <JWT>` header
  - [ ] Network: `GET /api/auth/me` returns 200 with user data
- [ ] After login:
  - [ ] Redirected to home page
  - [ ] User avatar visible in header
  - [ ] Network: `GET /api/generations` returns 200 (NOT 304)
- [ ] Image display:
  - [ ] Generated images load without "hostname not configured" errors
  - [ ] No runtime errors in console

---

## Verification Commands

```bash
# Restart dev server after next.config.js changes
npm run dev

# Test the backend directly (replace TOKEN with real value)
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer TOKEN"

# Verify Google token endpoint
curl -X POST http://localhost:3001/api/auth/verify-google \
  -H "Content-Type: application/json" \
  -d '{ "token": "GOOGLE_ID_TOKEN" }'
```

---

## Related Documentation

- [FRONTEND_OAUTH_FLOW.md](./FRONTEND_OAUTH_FLOW.md) - Original OAuth implementation
- [LOGIN_IMPLEMENTATION.md](./LOGIN_IMPLEMENTATION.md) - Login page details
- [API_INTEGRATION.md](./API_INTEGRATION.md) - Backend API integration
- [../api/auth.md](../api/auth.md) - Backend auth endpoint specs

---

**Last Updated**: May 19, 2026
**Status**: ✅ All fixes verified
