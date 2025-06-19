require('dotenv').config();
console.log('Groq API Key configured:', Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY \!== 'your-groq-api-key-here'));
console.log('Key starts with gsk_:', process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.startsWith('gsk_') : false);
console.log('Model configured: whisper-large-v3-turbo');
