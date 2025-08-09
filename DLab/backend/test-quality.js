import ytdl from '@distube/ytdl-core';

const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

async function testQualityDetection() {
  try {
    console.log('Testing quality detection with URL:', testUrl);
    
    const info = await ytdl.getInfo(testUrl);
    const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
    
    console.log('\n=== Available Formats ===');
    console.log('Total formats:', info.formats.length);
    console.log('Video+Audio formats:', formats.length);
    
    console.log('\n=== Quality Analysis ===');
    const qualityMap = new Map();
    
    formats.forEach((format, index) => {
      const quality = format.qualityLabel || `${format.height}p` || 'unknown';
      if (!qualityMap.has(quality)) {
        qualityMap.set(quality, []);
      }
      qualityMap.get(quality).push({
        index,
        height: format.height,
        qualityLabel: format.qualityLabel,
        container: format.container,
        hasVideo: format.hasVideo,
        hasAudio: format.hasAudio
      });
    });
    
    for (const [quality, formatList] of qualityMap.entries()) {
      console.log(`\n${quality}:`);
      formatList.forEach(f => {
        console.log(`  - ${f.height}p, ${f.container}, Video: ${f.hasVideo}, Audio: ${f.hasAudio}`);
      });
    }
    
    // Test specific quality selection
    console.log('\n=== Testing Quality Selection ===');
    const testQualities = ['1080', '720', '480', '360'];
    
    testQualities.forEach(quality => {
      const exactMatch = formats.find(f => 
        f.qualityLabel === `${quality}p` || 
        f.height === parseInt(quality)
      );
      
      console.log(`${quality}p: ${exactMatch ? '✅ Available' : '❌ Not found'}`);
      if (exactMatch) {
        console.log(`  Format: ${exactMatch.qualityLabel}, Height: ${exactMatch.height}, Container: ${exactMatch.container}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testQualityDetection();
