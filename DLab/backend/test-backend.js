import fetch from 'node-fetch';

const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll - always works for testing

async function testBackend() {
  try {
    console.log('Testing backend with URL:', testUrl);
    
    const response = await fetch('http://localhost:3001/api/video-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: testUrl }),
    });

    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! Video info:', data);
    } else {
      const error = await response.json();
      console.log('❌ Error response:', error);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

// Run test
testBackend();
