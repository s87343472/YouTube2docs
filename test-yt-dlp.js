const { spawn } = require('child_process');

function formatDuration(seconds) {
  if (seconds <= 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

function formatViewCount(views) {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  } else {
    return views.toString();
  }
}

async function testYtDlp(url) {
  return new Promise((resolve, reject) => {
    const args = [
      '--print',
      '%(title)s|%(uploader)s|%(duration)s|%(view_count)s|%(thumbnail)s',
      url
    ];
    
    const process = spawn('yt-dlp', args);
    let output = '';
    let errorOutput = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0 && output.trim()) {
        try {
          const parts = output.trim().split('|');
          console.log('Raw output:', output.trim());
          console.log('Split parts:', parts);
          
          const [title, uploader, duration, viewCount, thumbnail] = parts;
          
          console.log('Individual parts:');
          console.log('  title:', title);
          console.log('  uploader:', uploader);
          console.log('  duration:', duration);
          console.log('  viewCount:', viewCount);
          console.log('  thumbnail:', thumbnail);
          
          const durationInt = parseInt(duration) || 0;
          const formattedDuration = formatDuration(durationInt);
          
          const viewCountInt = parseInt(viewCount) || 0;
          const formattedViews = formatViewCount(viewCountInt);
          
          console.log('\nFormatted:');
          console.log('  duration:', `${duration} -> ${durationInt} -> ${formattedDuration}`);
          console.log('  views:', `${viewCount} -> ${viewCountInt} -> ${formattedViews}`);
          
          resolve({
            title: title || 'Unknown Title',
            channel: uploader || 'Unknown Channel',
            duration: formattedDuration,
            views: formattedViews,
            url: url,
            thumbnail: thumbnail || undefined
          });
        } catch (parseError) {
          console.error('Parse error:', parseError);
          reject(new Error('Failed to parse video information'));
        }
      } else {
        reject(new Error(`yt-dlp failed with code ${code}: ${errorOutput}`));
      }
    });
    
    process.on('error', (error) => {
      reject(new Error(`Failed to start yt-dlp: ${error.message}`));
    });
  });
}

// 测试
testYtDlp('https://www.youtube.com/watch?v=LF9sd-2jCoY')
  .then(result => {
    console.log('\n✅ Final result:');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
  }); 