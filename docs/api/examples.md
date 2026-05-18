# API Examples

Complete code examples for common workflows.

---

## Quick Start

### 1. Login with Google

Using React (@react-oauth/google):
```typescript
import { GoogleLogin } from '@react-oauth/google';

<GoogleLogin
  onSuccess={async (credentialResponse) => {
    // Send Google token to backend
    const response = await fetch('http://localhost:3001/api/auth/verify-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: credentialResponse.credential })
    });

    const data = await response.json();
    localStorage.setItem('auth_token', data.data.token);
    console.log('Logged in as:', data.data.user.email);
  }}
/>
```

Or vanilla JavaScript:
```javascript
// Assuming you have a Google token from google-signin-js
async function loginWithGoogle(googleToken) {
  const response = await fetch('http://localhost:3001/api/auth/verify-google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: googleToken })
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const data = await response.json();
  localStorage.setItem('auth_token', data.data.token);
  return data.data.user;
}
```

---

### 2. Create Generation

```javascript
const token = localStorage.getItem('auth_token');

const response = await fetch('http://localhost:3001/api/generations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'Modern minimalist living room',
    style: 'minimalist',
    aspectRatio: '16:9'
  })
});

const generation = await response.json();
console.log('Generation ID:', generation.id);
```

---

### 3. Wait for Image

```javascript
const token = localStorage.getItem('auth_token');
const generationId = 'your-generation-id';

async function pollForImage() {
  const response = await fetch(
    `http://localhost:3001/api/generations/${generationId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  const generation = await response.json();
  
  if (generation.status === 'success') {
    console.log('Image ready:', generation.imageUrl);
    return generation;
  } else if (generation.status === 'failed') {
    throw new Error(generation.errorMessage);
  }
  
  // Still processing, try again in 2 seconds
  await new Promise(r => setTimeout(r, 2000));
  return pollForImage();
}

const result = await pollForImage();
```

---

### 4. Display Image

```html
<img src="http://localhost:3001/api/images/550e8400-e29b-41d4-a716-446655440000.jpg" 
     alt="Generated design">
```

---

## Complete Workflow

### Generate → Wait → Display

```javascript
const token = localStorage.getItem('auth_token');

// Step 1: Create generation
const createResponse = await fetch('http://localhost:3001/api/generations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'Cozy scandinavian bedroom'
  })
});

const generation = await createResponse.json();
const generationId = generation.id;

// Step 2: Poll until complete
let current = generation;
while (current.status === 'pending' || current.status === 'processing') {
  await new Promise(r => setTimeout(r, 2000));
  
  const getResponse = await fetch(
    `http://localhost:3001/api/generations/${generationId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  current = await getResponse.json();
}

// Step 3: Check result
if (current.status === 'success') {
  console.log('Success! Image:', current.imageUrl);
  // Display image in gallery
  document.getElementById('gallery').innerHTML += `
    <img src="${current.imageUrl}" alt="${current.originalPrompt}">
  `;
} else {
  console.error('Failed:', current.errorMessage);
}
```

---

## API Helper Library

### Simple API Wrapper

```typescript
// lib/api.ts

const API_URL = 'http://localhost:3001';

function getToken() {
  return localStorage.getItem('auth_token');
}

async function api(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
}

export const generations = {
  create: (prompt, style, aspectRatio) =>
    api('/api/generations', {
      method: 'POST',
      body: JSON.stringify({ prompt, style, aspectRatio })
    }),
  
  list: () => api('/api/generations'),
  
  get: (id) => api(`/api/generations/${id}`),
  
  regenerate: (id, prompt, style, aspectRatio) =>
    api(`/api/generations/${id}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ prompt, style, aspectRatio })
    }),
  
  delete: (id) =>
    api(`/api/generations/${id}`, { method: 'DELETE' })
};

export const auth = {
  me: () => api('/api/auth/me'),
  logout: () => api('/api/auth/logout', { method: 'POST' })
};
```

### Usage

```typescript
// In your components
import { generations, auth } from '@/lib/api';

// Create generation
const gen = await generations.create('Modern kitchen', 'modern');
console.log('Created:', gen.id);

// List generations
const list = await generations.list();
console.log('Your designs:', list);

// Get specific generation
const detail = await generations.get(gen.id);
console.log('Status:', detail.status);

// Regenerate
const updated = await generations.regenerate(
  gen.id,
  'Modern kitchen with island',
  'modern'
);

// Delete
await generations.delete(gen.id);

// Get current user
const user = await auth.me();
console.log('Welcome,', user.name);
```

---

## React Component Examples

### Generation Form

```typescript
'use client';

import { useState } from 'react';
import { generations } from '@/lib/api';

export function GenerationForm() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('minimalist');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const gen = await generations.create(prompt, style);
      // Redirect to detail page
      window.location.href = `/gallery/${gen.id}`;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your design..."
        required
      />

      <select value={style} onChange={(e) => setStyle(e.target.value)}>
        <option value="minimalist">Minimalist</option>
        <option value="modern">Modern</option>
        <option value="industrial">Industrial</option>
        <option value="japandi">Japandi</option>
      </select>

      <button type="submit" disabled={loading}>
        {loading ? 'Generating...' : 'Generate'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
}
```

### Gallery List

```typescript
'use client';

import { useEffect, useState } from 'react';
import { generations } from '@/lib/api';
import Link from 'next/link';

export function GalleryList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generations.list()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading gallery...</div>;
  if (items.length === 0) return <div>No designs yet. Create one!</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
      {items.map((gen) => (
        <Link key={gen.id} href={`/gallery/${gen.id}`}>
          {gen.status === 'success' && (
            <img src={gen.imageUrl} alt={gen.originalPrompt} />
          )}
          {gen.status !== 'success' && (
            <div style={{ background: '#eee', height: '200px' }}>
              {gen.status === 'processing' && 'Generating...'}
              {gen.status === 'failed' && 'Error'}
            </div>
          )}
          <p>{gen.originalPrompt.slice(0, 50)}...</p>
        </Link>
      ))}
    </div>
  );
}
```

### Detail Page with Polling

```typescript
'use client';

import { useEffect, useState } from 'react';
import { generations } from '@/lib/api';

export function GenerationDetail({ id }) {
  const [generation, setGeneration] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let polling = true;

    const poll = async () => {
      try {
        const data = await generations.get(id);
        setGeneration(data);

        // Stop polling if complete
        if (data.status !== 'pending' && data.status !== 'processing') {
          polling = false;
          setLoading(false);
          return;
        }

        // Poll again in 2 seconds
        if (polling) {
          setTimeout(poll, 2000);
        }
      } catch (err) {
        console.error('Failed to fetch generation:', err);
        polling = false;
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
        <p>Generating image...</p>
      )}

      {generation.status === 'success' && (
        <>
          <img 
            src={generation.imageUrl} 
            alt={generation.originalPrompt}
            style={{ maxWidth: '100%' }}
          />
          <p>Style: {generation.style}</p>
          <p>Aspect ratio: {generation.aspectRatio}</p>
        </>
      )}

      {generation.status === 'failed' && (
        <p style={{ color: 'red' }}>
          Error: {generation.errorMessage}
        </p>
      )}

      <p>Created: {new Date(generation.createdAt).toLocaleString()}</p>
    </div>
  );
}
```

### Regenerate Form

```typescript
'use client';

import { useState } from 'react';
import { generations } from '@/lib/api';

export function RegenerateForm({ generationId, originalPrompt }) {
  const [prompt, setPrompt] = useState(originalPrompt);
  const [loading, setLoading] = useState(false);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      await generations.regenerate(generationId, prompt);
      // Reload page or update state
      window.location.reload();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        style={{ width: '100%', minHeight: '100px' }}
      />
      <button onClick={handleRegenerate} disabled={loading}>
        {loading ? 'Regenerating...' : 'Regenerate'}
      </button>
    </div>
  );
}
```

---

## Curl Examples

### Create Generation

```bash
TOKEN="your-base64-token"

curl -X POST http://localhost:3001/api/generations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Modern kitchen",
    "style": "modern",
    "aspectRatio": "16:9"
  }'
```

### List Generations

```bash
TOKEN="your-base64-token"

curl -X GET http://localhost:3001/api/generations \
  -H "Authorization: Bearer $TOKEN"
```

### Get Generation Detail

```bash
TOKEN="your-base64-token"
ID="507f1f77bcf86cd799439011"

curl -X GET http://localhost:3001/api/generations/$ID \
  -H "Authorization: Bearer $TOKEN"
```

### Poll for Completion

```bash
TOKEN="your-base64-token"
ID="507f1f77bcf86cd799439011"

# Run in loop until status is success or failed
for i in {1..30}; do
  echo "Poll #$i"
  curl -s http://localhost:3001/api/generations/$ID \
    -H "Authorization: Bearer $TOKEN" | jq '.status'
  sleep 2
done
```

### Regenerate

```bash
TOKEN="your-base64-token"
ID="507f1f77bcf86cd799439011"

curl -X POST http://localhost:3001/api/generations/$ID/regenerate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Japanese minimalist bedroom",
    "style": "japandi"
  }'
```

### Delete Generation

```bash
TOKEN="your-base64-token"
ID="507f1f77bcf86cd799439011"

curl -X DELETE http://localhost:3001/api/generations/$ID \
  -H "Authorization: Bearer $TOKEN"
```

### Get Current User

```bash
TOKEN="your-base64-token"

curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Download Image

```bash
curl -o design.jpg \
  http://localhost:3001/api/images/550e8400-e29b-41d4-a716-446655440000.jpg
```

---

## Error Handling

### Try-Catch with Detailed Errors

```javascript
async function generateDesign(prompt) {
  try {
    const response = await generations.create(prompt, 'minimalist');
    return response;
  } catch (error) {
    console.error('Failed to generate:', error.message);

    if (error.message.includes('Prompt is required')) {
      alert('Please enter a design description');
    } else if (error.message.includes('Unauthorized')) {
      alert('Please sign in again');
      window.location.href = '/';
    } else {
      alert('Error: ' + error.message);
    }

    throw error;
  }
}
```

### Retry with Backoff

```typescript
async function retryWithBackoff(fn, maxAttempts = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retry in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// Usage
const generation = await retryWithBackoff(
  () => generations.create('Modern kitchen')
);
```

---

## Testing

### Mock API for Testing

```typescript
// __mocks__/api.ts
export const generations = {
  create: jest.fn(() =>
    Promise.resolve({
      id: 'test-id',
      status: 'pending',
      originalPrompt: 'test'
    })
  ),
  list: jest.fn(() =>
    Promise.resolve([
      {
        id: 'test-id',
        status: 'success',
        imageUrl: 'http://test.jpg'
      }
    ])
  )
};
```

### Test Component

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GenerationForm } from './GenerationForm';
import * as api from '@/lib/api';

jest.mock('@/lib/api');

describe('GenerationForm', () => {
  it('creates generation on submit', async () => {
    render(<GenerationForm />);

    const input = screen.getByPlaceholderText('Describe your design...');
    await userEvent.type(input, 'Modern kitchen');

    const button = screen.getByRole('button');
    await userEvent.click(button);

    expect(api.generations.create).toHaveBeenCalledWith(
      'Modern kitchen',
      'minimalist'
    );
  });
});
```

---

## Performance Tips

### Debounce Search

```typescript
import { useState, useCallback } from 'react';

export function SearchGallery() {
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState('');

  const handleSearch = useCallback(
    debounce(async (q) => {
      const all = await generations.list();
      const filtered = all.filter(g =>
        g.originalPrompt.toLowerCase().includes(q.toLowerCase())
      );
      setResults(filtered);
    }, 300),
    []
  );

  return (
    <input
      onChange={(e) => {
        setQuery(e.target.value);
        handleSearch(e.target.value);
      }}
      placeholder="Search designs..."
    />
  );
}

function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}
```

### Lazy Loading Images

```html
<img src={generation.imageUrl} loading="lazy" alt={generation.originalPrompt}>
```

---

## Monitoring & Logging

### Log All API Calls

```typescript
const originalFetch = fetch;
window.fetch = function(...args) {
  const [url, options] = args;
  console.log('API Request:', {
    method: options?.method || 'GET',
    url,
    timestamp: new Date().toISOString()
  });

  return originalFetch.apply(this, args)
    .then(response => {
      console.log('API Response:', {
        status: response.status,
        url,
        timestamp: new Date().toISOString()
      });
      return response;
    })
    .catch(error => {
      console.error('API Error:', {
        url,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    });
};
```

---

## More Examples

See individual endpoint documentation:
- [Auth Endpoints](./auth.md#examples)
- [Generation Endpoints](./generations.md#examples)
- [Image Endpoints](./images.md#examples)
