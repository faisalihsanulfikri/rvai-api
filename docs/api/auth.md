# Authentication Endpoints

Base path: `/api/auth`

## Initiate Google OAuth

Start the Google OAuth login flow.

```
GET /api/auth/google
```

**Authentication**: ❌ Not required

**Description**: Initiates Google OAuth 2.0 authentication. Redirects user to Google login page.

**Response**: Redirects to Google OAuth consent screen

**Example**:
```html
<a href="http://localhost:3001/api/auth/google">
  Sign in with Google
</a>
```

**Notes**:
- User will be prompted to authorize the app at Google
- After authorization, Google redirects to `/api/auth/google/callback`
- Callback redirects user back to frontend with token in URL

---

## Google OAuth Callback

Internal callback endpoint. Called by Google after user authorizes.

```
GET /api/auth/google/callback?code=...&state=...
```

**Authentication**: ❌ Not required (handled by Passport)

**Description**: Receives authorization code from Google, exchanges for user info, creates/updates user in database, generates token, and redirects to frontend.

**Response**: 
```
Location: http://localhost:3000?token=BASE64_TOKEN
```

**What happens**:
1. Passport verifies code with Google
2. Retrieves user profile (email, name, picture)
3. Creates or updates user in MongoDB
4. Generates base64 token
5. Redirects to frontend with token in query parameter

**On Error**:
```
Location: http://localhost:3000?error=callback_failed
```

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

### 1. Frontend initiates login
```html
<a href="http://localhost:3001/api/auth/google">
  Sign in with Google
</a>
```

### 2. User authorizes at Google
User sees Google consent screen and clicks "Allow"

### 3. Browser redirected to callback
```
GET http://localhost:3001/api/auth/google/callback?code=...&state=...
```

### 4. Callback returns to frontend with token
```
Location: http://localhost:3000?token=eyJ1c2VySWQiOi4uLn0=
```

### 5. Frontend extracts token and stores it
```typescript
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
localStorage.setItem('auth_token', token);
```

### 6. Use token in all requests
```typescript
const token = localStorage.getItem('auth_token');
fetch('http://localhost:3001/api/generations', {
  headers: { Authorization: `Bearer ${token}` }
});
```

### 7. Get current user info
```typescript
const user = await fetch('http://localhost:3001/api/auth/me', {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());
```

### 8. Logout
```typescript
localStorage.removeItem('auth_token');
```

---

## Google OAuth Configuration

Required environment variables:

```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
```

**Get credentials**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new OAuth 2.0 Web Application credentials
3. Add redirect URI: `http://localhost:3001/api/auth/google/callback`
4. Copy Client ID and Secret to `.env`

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
