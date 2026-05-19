# Frontend Google OAuth Flow

**Date**: May 19, 2026  
**Version**: v0.5.1  
**Status**: Updated

---

## Overview

Changed from backend-initiated OAuth to **frontend-initiated OAuth**:
- ✅ Frontend directly handles Google OAuth
- ✅ Frontend obtains Google ID token
- ✅ Frontend sends token to backend for verification
- ✅ Backend issues JWT for session management

---

## New Flow Diagram

```
1. User visits / without auth token
   ↓
2. Middleware checks cookie, finds none
   ↓
3. Redirects to /login
   ↓
4. User sees login page with "Sign in with Google" button
   ↓
5. User clicks button
   ↓
6. Google OAuth popup appears (handled by @react-oauth/google)
   ↓
7. User authorizes at Google
   ↓
8. Google returns ID token directly to frontend
   ↓
9. Frontend receives credential (ID token)
   ↓
10. Frontend sends token to: POST /api/auth/verify-google
    Body: { token: "<GOOGLE_ID_TOKEN>" }
   ↓
11. Backend verifies token with Google
   ↓
12. Backend issues JWT and returns: { token: "<JWT>" }
   ↓
13. Frontend stores JWT in localStorage + cookie
   ↓
14. Middleware allows access to protected routes
   ↓
15. User redirected to home page
```

---

## Setup Required

### 1. Google Cloud Console Setup

You need a Google OAuth 2.0 credential:

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credential (Web application):
   - **Name**: RoomVision AI
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (dev)
     - `https://yourdomain.com` (prod)
   - **Authorized redirect URIs**: (not needed for frontend OAuth)
     - `http://localhost:3000` (optional)
5. Copy the **Client ID** (looks like `xxx.apps.googleusercontent.com`)

### 2. Frontend Configuration

Add to `.env.local`:
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
```

### 3. Backend Configuration

Implement endpoint to verify Google token:

```
POST /api/auth/verify-google

Request Body:
{
  "token": "<GOOGLE_ID_TOKEN>"
}

Response (success):
{
  "token": "<JWT_TOKEN>"
}

Response (error):
{
  "error": "Invalid token"
}
```

**Backend should:**
1. Receive Google ID token
2. Verify token with Google's API (using `google-auth-library`)
3. Extract user info from token (email, name, picture, etc.)
4. Find or create user in database
5. Issue JWT for session
6. Return JWT

---

## Files Changed

### Modified Files

**1. `components/providers.tsx`**
- Added `GoogleOAuthProvider` wrapper
- Reads `NEXT_PUBLIC_GOOGLE_CLIENT_ID` from env

**2. `context/auth-context.tsx`**
- Added `verifyGoogleToken(googleToken)` method
- Handles token verification with backend
- Stores JWT from backend response

**3. `lib/api.ts`**
- Added `auth.verifyGoogle(googleToken)` method
- Sends Google token to `/api/auth/verify-google`
- Returns JWT from backend

**4. `app/login/page.tsx`**
- Replaced custom button with `<GoogleLogin>` component
- Uses `@react-oauth/google` for OAuth handling
- Shows error messages
- Handles login state

**5. `.env.local`**
- Added `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

---

## Component Details

### GoogleOAuthProvider Wrapper

Located in `components/providers.tsx`:
```tsx
<GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
  <AuthProvider>{children}</AuthProvider>
</GoogleOAuthProvider>
```

### GoogleLogin Component

Located in `app/login/page.tsx`:
```tsx
<GoogleLogin
  onSuccess={handleGoogleSuccess}
  onError={handleGoogleError}
  text="signin_with"
  width="320"
/>
```

**Callback:**
```tsx
const handleGoogleSuccess = async (credentialResponse: any) => {
  const googleToken = credentialResponse.credential
  await verifyGoogleToken(googleToken)
  router.push('/')
}
```

---

## Security Features

### 1. Token Verification
- Google token verified on backend
- Backend confirms token authenticity
- Prevents token spoofing

### 2. JWT for Sessions
- Backend issues JWT after verification
- JWT stored in localStorage + cookie
- Backend can revoke JWT if needed

### 3. HTTPS in Production
- Frontend OAuth requires HTTPS
- Token transmission encrypted
- Secure cookie storage

### 4. CORS Protection
- Only your domain can use Google credential
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is public (safe)
- Backend verifies with Google's servers

---

## Backend Implementation Example

### Node.js + Express

```javascript
const { OAuth2Client } = require('google-auth-library')

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

app.post('/api/auth/verify-google', async (req, res) => {
  try {
    const { token } = req.body

    // Verify token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    const { email, name, picture, sub: googleId } = payload

    // Find or create user
    let user = await User.findOne({ email })
    if (!user) {
      user = await User.create({
        email,
        name,
        picture,
        googleId,
      })
    }

    // Issue JWT
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ token: jwtToken })
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
})
```

---

## Testing the Flow

### 1. Local Testing
```bash
# Add to .env.local
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID

# Start dev server
npm run dev

# Visit http://localhost:3000
# Should redirect to /login
# Click "Sign in with Google"
# Should open Google popup
# After authorization, should see backend error (if /api/auth/verify-google not ready)
```

### 2. Check Network Tab (DevTools)
- POST request to `/api/auth/verify-google`
- Request body includes Google token
- Response should include JWT token

### 3. Check Local Storage
- After successful login, check `localStorage.getItem('auth_token')`
- Should contain JWT token

### 4. Check Cookie
- In DevTools → Storage → Cookies
- Should have `auth_token` cookie

---

## Advantages Over Backend OAuth

### ✅ Pros
1. **No backend redirect needed** - Simpler flow
2. **Direct token from Google** - No intermediary
3. **Faster authentication** - Fewer network hops
4. **Better UX** - Popup instead of redirect
5. **Cleaner separation** - Frontend handles OAuth, backend verifies

### ⚠️ Cons
1. **Google Client ID is public** - But that's by design (required)
2. **Backend must verify token** - Extra work (but more secure)
3. **Need Google Cloud setup** - One-time configuration

---

## Troubleshooting

### "Invalid Client ID" error
- Check `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in .env.local
- Verify in Google Cloud Console
- Ensure http://localhost:3000 is in authorized origins

### Google popup doesn't appear
- Check browser console for errors
- Verify GoogleOAuthProvider is wrapping the app
- Check that Client ID is correct

### "Invalid token" from backend
- Verify backend has Google Client ID configured
- Check backend is verifying with correct audience
- Ensure Google token is being sent to backend

### Stuck on login page after click
- Check network tab for POST to `/api/auth/verify-google`
- If 404: Backend endpoint doesn't exist yet
- If 401: Token verification failed

---

## Environment Variables Checklist

- [ ] `NEXT_PUBLIC_API_URL=http://localhost:3001`
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com`
- [ ] Backend has `GOOGLE_CLIENT_ID` configured
- [ ] Backend has `JWT_SECRET` configured

---

## Related Documentation

- [LOGIN_IMPLEMENTATION.md](./LOGIN_IMPLEMENTATION.md) - Original login page
- [API_INTEGRATION.md](./API_INTEGRATION.md) - Backend API integration

---

**Last Updated**: May 19, 2026  
**Status**: ✅ Complete
