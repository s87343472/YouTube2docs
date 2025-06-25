const Groq = require('groq-sdk');
require('dotenv').config();

async function testGroqAPI() {
  console.log('Testing Groq API connection...');
  
  if (\!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY not found in environment');
    return;
  }
  
  console.log('API Key found:', process.env.GROQ_API_KEY.substring(0, 8) + '...');
  
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
  
  try {
    console.log('Testing text completion...');
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Say hello' }],
      model: 'llama3-8b-8192',
      max_tokens: 10
    });
    
    console.log('Text completion works:', completion.choices[0].message.content);
    
    console.log('Listing available models...');
    const models = await groq.models.list();
    console.log('Available models:', models.data.map(m => m.id).join(', '));
    
    const whisperModels = models.data.filter(m => m.id.includes('whisper'));
    console.log('Whisper models:', whisperModels.map(m => m.id));
    
  } catch (error) {
    console.error('Groq API test failed:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
  }
}

testGroqAPI().catch(console.error);
EOL < /dev/null