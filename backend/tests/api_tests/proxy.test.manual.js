import axios from 'axios';

/**
 * Test script to verify proxy endpoint is working
 * Run with: node backend/tests/proxy.test.manual.js
 */

const BASE_URL = 'http://localhost:3000';

async function testProxy() {
  try {
    console.log('Testing proxy endpoint...\n');

    // Test 1: Simple GET request
    console.log('Test 1: GET request to httpbin.org');
    const res1 = await axios.post(`${BASE_URL}/proxy`, {
      url: 'https://httpbin.org/get',
      method: 'GET',
      headers: {},
      body: null,
    });
    console.log('✓ Status:', res1.data.status);
    console.log('✓ Response:', JSON.stringify(res1.data.data).slice(0, 100) + '...\n');

    // Test 2: POST request with headers
    console.log('Test 2: POST request with custom headers');
    const res2 = await axios.post(`${BASE_URL}/proxy`, {
      url: 'https://httpbin.org/post',
      method: 'POST',
      headers: {
        'X-Custom-Header': 'test-value',
        'Authorization': 'Bearer token123',
      },
      body: { message: 'Hello from proxy' },
    });
    console.log('✓ Status:', res2.data.status);
    console.log('✓ Headers received:', res2.data.headers || 'No rate limit headers\n');

    // Test 3: MailerSend API (if you have auth)
    console.log('Test 3: MailerSend API (optional)');
    const mailersendKey = process.env.MAILERSEND_API_KEY;
    if (mailersendKey) {
      const res3 = await axios.post(`${BASE_URL}/proxy`, {
        url: 'https://api.mailersend.com/v1/account/domain',
        method: 'GET',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${mailersendKey}`,
        },
        body: null,
      });
      console.log('✓ Status:', res3.data.status);
      console.log('✓ Data:', JSON.stringify(res3.data.data).slice(0, 100) + '...\n');
    } else {
      console.log('⊘ Skipped (no MAILERSEND_API_KEY in .env)\n');
    }

    console.log('All tests passed! ✓');
  } catch (err) {
    console.error('✗ Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

testProxy();
