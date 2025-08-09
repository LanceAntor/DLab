import fetch from 'node-fetch';

const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll

async function testVideoInfo() {
  try {
    console.log('Testing video info endpoint...');
    console.log('URL:', testUrl);
    
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
      console.log('\n=== VIDEO INFO RESPONSE ===');
      console.log('Title:', data.title);
      console.log('Duration:', data.duration);
      console.log('Available Qualities:', data.availableQualities);
      console.log('Quality Count:', data.availableQualities.length);
      
      console.log('\n=== FRONTEND DROPDOWN PREVIEW ===');
      data.availableQualities.forEach(quality => {
        const value = quality.replace('p', '');
        console.log(`<option value="${value}">${quality}</option>`);
      });
      
    } else {
      const error = await response.json();
      console.log('❌ Error response:', error);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

// Run test
testVideoInfo();
