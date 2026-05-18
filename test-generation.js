#!/usr/bin/env node

// Test script to verify generation flow
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

// Create a test token
const testToken = Buffer.from(JSON.stringify({
  userId: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  iat: Date.now()
})).toString('base64');

console.log('🧪 Testing Generation Flow\n');
console.log(`Token: ${testToken}\n`);

async function test() {
  try {
    // Test 1: Create generation
    console.log('1️⃣  Creating generation...');
    const createRes = await fetch(`${BASE_URL}/api/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'Modern minimalist living room with natural light',
        style: 'minimalist',
        aspectRatio: '16:9'
      })
    });

    if (!createRes.ok) {
      console.error(`❌ Failed to create generation: ${createRes.status}`);
      console.error(await createRes.text());
      return;
    }

    const generation = await createRes.json();
    console.log(`✅ Generation created!`);
    console.log(`   ID: ${generation.id}`);
    console.log(`   Status: ${generation.status}\n`);

    // Test 2: Check status after a few seconds
    console.log('2️⃣  Waiting 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('3️⃣  Checking generation status...');
    const getRes = await fetch(`${BASE_URL}/api/generations/${generation.id}`, {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });

    if (!getRes.ok) {
      console.error(`❌ Failed to fetch generation: ${getRes.status}`);
      return;
    }

    const updated = await getRes.json();
    console.log(`✅ Generation status check:`);
    console.log(`   Status: ${updated.status}`);
    console.log(`   Final Prompt: ${updated.finalPrompt}`);
    console.log(`   Image URL: ${updated.imageUrl || '(not ready yet)'}\n`);

    if (updated.status === 'pending') {
      console.log('⏳ Still pending... Worker may be processing');
    } else if (updated.status === 'processing') {
      console.log('⏳ Processing... Image generation in progress');
    } else if (updated.status === 'success') {
      console.log('✅ Success! Image generation completed');
    } else if (updated.status === 'failed') {
      console.log(`❌ Failed: ${updated.errorMessage}`);
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

test();
