# Authentication Endpoints

Base path: `/api/auth`

## Verify Google Token

Exchange a Google ID token for an app authentication token.

```
POST /api/auth/verify-google
```

**Authentication**: ❌ Not required

**Description**: Accepts a Google ID token (from Google Sign-In), verifies it, creates/updates the user in the database, and returns an app authentication token.

**Request Body**:
```json
{
  "token": "<google_id_token>"
}
```

**Response** (200 OK):
```json
{
  "id": "auth",
  "status": "success",
  "data": {
    "token": "eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJuYW1lIjoiSm9obiBEb2UiLCJpYXQiOjE2ODczMTI3Mjh9",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "John Doe",
      "picture": "https://lh3.googleusercontent.com/..."
    }
  }
}
```

**Status Codes**:
- `200` - Success
- `400` - Missing or invalid request body
- `401` - Invalid or expired Google token
- `500` - Server error

**What happens**:
1. Decodes the Google ID token
2. Extracts user info (email, name, picture, Google ID)
3. Creates new user or updates existing user in MongoDB
4. Generates app authentication token (base64-encoded JSON)
5. Returns token and user info

**Example**:
```bash
curl -X POST http://localhost:3001/api/auth/verify-google \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjExIn0..."
  }'
```

**JavaScript/TypeScript**:
```typescript
// After getting token from Google Sign-In library
const response = await fetch('http://localhost:3001/api/auth/verify-google', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: googleToken })
});

const data = await response.json();
if (response.ok) {
  localStorage.setItem('auth_token', data.data.token);
  console.log('Logged in as:', data.data.user.email);
} else {
  console.error('Login failed:', data.error);
}
```

**Notes**:
- Google token should be obtained from Google Sign-In library on frontend
- Tokens don't expire; frontend can store indefinitely
- On next app launch, user is already logged in if token exists

---

## Get Current User

Get the profile of the authenticated user.

```
GET /api/auth/me
```

**Authentication**: ✅ Required

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "name": "John Doe",
  "picture": "https://lh3.googleusercontent.com/..."
}
```

**Status Codes**:
- `200` - Success
- `401` - Unauthorized (missing/invalid token)
- `404` - User not found (shouldn't happen if token is valid)
- `500` - Server error

**Example**:
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJuYW1lIjoiSm9obiBEb2UiLCJpYXQiOjE2ODczMTI3Mjh9"
```

**JavaScript**:
```typescript
const token = localStorage.getItem('auth_token');
const response = await fetch('http://localhost:3001/api/auth/me', {
  headers: { Authorization: `Bearer ${token}` }
});
const user = await response.json();
console.log(user);
```

---

## Logout

Logout the current user.

```
POST /api/auth/logout
```

**Authentication**: ✅ Required (but token not actually verified for logout)

**Response** (200 OK):
```json
{
  "success": true
}
```

**What happens**:
1. Currently just returns success
2. Frontend should delete token from localStorage
3. No server-side session state to clear

**Example**:
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**JavaScript**:
```typescript
const token = localStorage.getItem('auth_token');
await fetch('http://localhost:3001/api/auth/logout', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` }
});
localStorage.removeItem('auth_token');
window.location.href = '/';
```

---

## Token Format

Tokens are base64-encoded JSON objects.

**Structure**:
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "name": "John Doe",
  "iat": 1687312728
}
```

**Decoding**:
```javascript
const token = "eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJuYW1lIjoiSm9obiBEb2UiLCJpYXQiOjE2ODczMTI3Mjh9";
const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
console.log(decoded);
// {
//   userId: "507f1f77bcf86cd799439011",
//   email: "user@example.com",
//   name: "John Doe",
//   iat: 1687312728
// }
```

**Note**: These tokens don't expire. In production, use JWT with expiration.

---

## Error Responses

See [errors.md](./errors.md) for detailed error documentation.

### Common Auth Errors

| Error | Status | Cause | Solution |
|-------|--------|-------|----------|
| `No token provided` | 401 | Missing Authorization header | Add header: `Authorization: Bearer <token>` |
| `Invalid token` | 401 | Malformed or corrupted token | Get new token from OAuth flow |
| `Unauthorized` | 401 | Token user doesn't own resource | Use correct token for this user |
| `User not found` | 404 | Token references non-existent user | Get new token from OAuth |

---

## Full Login Flow Example

### 1. Frontend gets Google ID token
Use Google Sign-In library (@react-oauth/google for React, google-signin for web):
```typescript
// React example with @react-oauth/google
import { GoogleLogin } from '@react-oauth/google';

<GoogleLogin
  onSuccess={credentialResponse => {
    const googleToken = credentialResponse.credential;
    // Send to backend
  }}
  onError={() => console.log('Login Failed')}
/>
```

Or vanilla JS with Google Sign-In:
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
<div id="g_id_onload"
     data-client_id="YOUR_CLIENT_ID"
     data-callback="handleCredentialResponse">
</div>
<div class="g_id_signin" data-type="standard"></div>
```

### 2. Frontend sends token to backend
```typescript
const response = await fetch('http://localhost:3001/api/auth/verify-google', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: googleToken })
});

const data = await response.json();
localStorage.setItem('auth_token', data.data.token);
```

### 3. Frontend uses app token for API calls
```typescript
const token = localStorage.getItem('auth_token');
const response = await fetch('http://localhost:3001/api/generations', {
  headers: { Authorization: `Bearer ${token}` }
});
```

### 4. Get current user info
```typescript
const token = localStorage.getItem('auth_token');
const user = await fetch('http://localhost:3001/api/auth/me', {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());
console.log('User:', user);
```

### 5. Logout
```typescript
localStorage.removeItem('auth_token');
// Optional: notify backend
await fetch('http://localhost:3001/api/auth/logout', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` }
});
```

---

## Google OAuth Configuration

Required environment variable:

```
GEMINI_API_KEY=your_gemini_api_key
```

**Frontend Configuration**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new OAuth 2.0 Web Application credentials
3. Add authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
4. Copy Client ID to frontend `.env`
5. Use Google Sign-In library in your frontend app

**No backend OAuth configuration needed** - Google token validation happens via JWT decoding

---

## Security Notes

1. **HTTPS in Production**: Always use HTTPS for OAuth
2. **Token Storage**: Store token securely (localStorage is acceptable for basic use)
3. **CORS**: Only frontend origin can access API
4. **No Expiration**: Current tokens don't expire - add expiration in production
5. **Stateless**: Server doesn't keep sessions - all auth info is in token

---

## Future Improvements

- [ ] JWT tokens with expiration
- [ ] Refresh token mechanism
- [ ] Multi-provider OAuth (GitHub, Microsoft, etc.)
- [ ] Magic link authentication
- [ ] TOTP/2FA
- [ ] Social linking
