# Frontend Integration Guide

How to connect your Next.js frontend to the RoomVision AI backend.

## Environment Setup

Add to your frontend `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 1. Authentication

### Get Token from URL

After Google OAuth redirects back to frontend with token in URL:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const error = params.get('error');

    if (error) {
      console.error('Auth error:', error);
      router.push('/');
      return;
    }

    if (urlToken) {
      localStorage.setItem('auth_token', urlToken);
      setToken(urlToken);
      // Clean URL
      router.replace('/');
    } else {
      const stored = localStorage.getItem('auth_token');
      if (stored) setToken(stored);
    }
  }, [router]);

  return (
    <html>
      <body>
        {children}
      </body>
    </html>
  );
}
```

### Create API Helper

Create `lib/api.ts`:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

// Specific methods
export const api = {
  generations: {
    create: (data: any) =>
      apiCall('/api/generations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: () => apiCall('/api/generations'),
    get: (id: string) => apiCall(`/api/generations/${id}`),
    regenerate: (id: string, data: any) =>
      apiCall(`/api/generations/${id}/regenerate`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiCall(`/api/generations/${id}`, { method: 'DELETE' }),
  },
  auth: {
    me: () => apiCall('/api/auth/me'),
    logout: () => apiCall('/api/auth/logout', { method: 'POST' }),
  },
};
```

## 2. Use in Components

### Prompt Form Component

```typescript
'use client';

import { api } from '@/lib/api';
import { useState } from 'react';

export function PromptForm() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('minimalist');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const generation = await api.generations.create({
        prompt,
        style,
        aspectRatio: '16:9',
      });

      console.log('Generation started:', generation);
      // Redirect to generation detail page
      window.location.href = `/gallery/${generation.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your ideal interior design..."
      />

      <select value={style} onChange={(e) => setStyle(e.target.value)}>
        <option value="minimalist">Minimalist</option>
        <option value="modern">Modern</option>
        <option value="industrial">Industrial</option>
        <option value="japandi">Japandi</option>
      </select>

      <button type="submit" disabled={loading}>
        {loading ? 'Generating...' : 'Generate Design'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
}
```

### Poll for Generation Status

```typescript
'use client';

import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

export function GenerationDetail({ id }: { id: string }) {
  const [generation, setGeneration] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let polling = true;

    const poll = async () => {
      try {
        const data = await api.generations.get(id);
        setGeneration(data);

        // Stop polling if generation is complete
        if (data.status !== 'pending' && data.status !== 'processing') {
          polling = false;
        }
      } catch (err) {
        console.error('Failed to fetch generation:', err);
      }

      if (polling) {
        setTimeout(poll, 2000); // Poll every 2 seconds
      } else {
        setLoading(false);
      }
    };

    poll();

    return () => {
      polling = false;
    };
  }, [id]);

  if (loading) return <div>Loading...</div>;

  if (!generation) return <div>Not found</div>;

  return (
    <div>
      <h1>{generation.originalPrompt}</h1>

      {generation.status === 'processing' && (
        <p>Generating...</p>
      )}

      {generation.status === 'success' && generation.imageUrl && (
        <img src={generation.imageUrl} alt="Generated" />
      )}

      {generation.status === 'failed' && (
        <p style={{ color: 'red' }}>
          Error: {generation.errorMessage}
        </p>
      )}

      <p>Style: {generation.style}</p>
      <p>Created: {new Date(generation.createdAt).toLocaleString()}</p>
    </div>
  );
}
```

### Gallery List

```typescript
'use client';

import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export function GalleryGrid() {
  const [generations, setGenerations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.generations
      .list()
      .then(setGenerations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading gallery...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
      {generations.map((gen) => (
        <Link key={gen.id} href={`/gallery/${gen.id}`}>
          <div>
            {gen.imageUrl && (
              <img src={gen.imageUrl} alt={gen.originalPrompt} />
            )}
            <p>{gen.originalPrompt.substring(0, 50)}...</p>
            <span>{gen.status}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
```

## 3. Handle OAuth Login

Add Google login button:

```typescript
export function LoginButton() {
  return (
    <a href="http://localhost:3001/api/auth/google">
      <button>Sign in with Google</button>
    </a>
  );
}
```

## 4. Handle Logout

```typescript
export function LogoutButton() {
  const handleLogout = async () => {
    localStorage.removeItem('auth_token');
    await api.auth.logout();
    window.location.href = '/';
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

## 5. Check Authentication

```typescript
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}

// Usage
export function Header() {
  const { user, loading } = useAuth();

  if (loading) return <div>...</div>;

  return (
    <header>
      {user ? (
        <>
          <span>Welcome, {user.name}</span>
          <LogoutButton />
        </>
      ) : (
        <LoginButton />
      )}
    </header>
  );
}
```

## 6. Environment Variables

Update `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Production:

```
NEXT_PUBLIC_API_URL=https://your-api.com
```

## Testing

### Test API with curl

```bash
# Get token (replace with actual token from OAuth)
TOKEN="your_base64_token"

# Create generation
curl -X POST http://localhost:3001/api/generations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Minimalist kitchen with marble counters",
    "style": "minimalist"
  }'

# List generations
curl http://localhost:3001/api/generations \
  -H "Authorization: Bearer $TOKEN"

# Get specific generation
curl http://localhost:3001/api/generations/UUID \
  -H "Authorization: Bearer $TOKEN"
```

## Common Issues

### CORS Error

Ensure backend CORS is configured:
```
FRONTEND_URL=http://localhost:3000
```

### Token not persisting

Make sure `localStorage` is available (not in SSR):
```typescript
if (typeof window !== 'undefined') {
  localStorage.setItem('auth_token', token);
}
```

### Image not showing

Check:
1. Image generation is complete (status: success)
2. imageUrl is returned from API
3. Backend server is running and serving `/api/images/:filename`

## Next Steps

1. Update your frontend components with API calls
2. Add error handling and loading states
3. Implement real-time updates with WebSocket (optional)
4. Add request validation
5. Add TypeScript types for API responses
