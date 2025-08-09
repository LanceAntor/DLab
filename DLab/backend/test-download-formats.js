// Test download format selection
import ytdl from '@distube/ytdl-core';

const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

async function testDownloadFormats() {
  try {
    console.log('Testing download format selection...');
    console.log('URL:', testUrl);
    
    const info = await ytdl.getInfo(testUrl);
    
    console.log('\n=== ALL FORMATS ===');
    const allFormats = info.formats || [];
    console.log(`Total formats: ${allFormats.length}`);
    
    console.log('\n=== VIDEO+AUDIO FORMATS ===');
    const videoAndAudioFormats = ytdl.filterFormats(allFormats, 'videoandaudio');
    videoAndAudioFormats.forEach((format, index) => {
      console.log(`${index + 1}: ${format.qualityLabel} (${format.height}p) - ${format.container} - itag:${format.itag} - Has Video: ${format.hasVideo}, Has Audio: ${format.hasAudio}`);
    });
    
    console.log('\n=== VIDEO-ONLY FORMATS ===');
    const videoOnlyFormats = ytdl.filterFormats(allFormats, 'videoonly');
    videoOnlyFormats.forEach((format, index) => {
      console.log(`${index + 1}: ${format.qualityLabel} (${format.height}p) - ${format.container} - itag:${format.itag} - Has Video: ${format.hasVideo}, Has Audio: ${format.hasAudio}`);
    });
    
    console.log('\n=== TESTING QUALITY SELECTION ===');
    
    // Test 1080p selection
    const target1080 = videoAndAudioFormats.find(f => f.height === 1080);
    if (target1080) {
      console.log('✅ 1080p video+audio available:', target1080.qualityLabel, 'itag:', target1080.itag);
    } else {
      const video1080 = videoOnlyFormats.find(f => f.height === 1080);
      if (video1080) {
        console.log('⚠️ 1080p only available as video-only:', video1080.qualityLabel, 'itag:', video1080.itag);
        console.log('   Recommend using lower quality with audio');
      } else {
        console.log('❌ 1080p not available');
      }
    }
    
    // Test 720p selection
    const target720 = videoAndAudioFormats.find(f => f.height === 720);
    if (target720) {
      console.log('✅ 720p video+audio available:', target720.qualityLabel, 'itag:', target720.itag);
    } else {
      console.log('❌ 720p video+audio not available');
    }
    
    // Test 480p selection
    const target480 = videoAndAudioFormats.find(f => f.height === 480);
    if (target480) {
      console.log('✅ 480p video+audio available:', target480.qualityLabel, 'itag:', target480.itag);
    } else {
      console.log('❌ 480p video+audio not available');
    }
    
    // Test 360p selection
    const target360 = videoAndAudioFormats.find(f => f.height === 360);
    if (target360) {
      console.log('✅ 360p video+audio available:', target360.qualityLabel, 'itag:', target360.itag);
    } else {
      console.log('❌ 360p video+audio not available');
    }
    
    console.log('\n=== RECOMMENDATION ===');
    if (videoAndAudioFormats.length > 0) {
      const best = videoAndAudioFormats.reduce((best, current) => {
        return (current.height || 0) > (best.height || 0) ? current : best;
      });
      console.log(`Best combined format: ${best.qualityLabel} (${best.height}p) - itag:${best.itag}`);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testDownloadFormats();
