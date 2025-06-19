"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_CONFIG = exports.gemini = exports.groq = void 0;
exports.initGroq = initGroq;
exports.initGemini = initGemini;
exports.hasGroqKey = hasGroqKey;
exports.hasGeminiKey = hasGeminiKey;
exports.testAPIConnections = testAPIConnections;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const generative_ai_1 = require("@google/generative-ai");
// API clients - 延迟初始化以避免启动时错误  
exports.groq = null;
exports.gemini = null;
// 初始化Groq客户端
function initGroq() {
    if (!exports.groq && process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your-groq-api-key-here') {
        exports.groq = new groq_sdk_1.default({
            apiKey: process.env.GROQ_API_KEY,
        });
    }
    return exports.groq;
}
// 初始化Gemini客户端
function initGemini() {
    if (!exports.gemini && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here') {
        exports.gemini = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return exports.gemini;
}
// 检查API密钥是否可用
function hasGroqKey() {
    return !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your-groq-api-key-here');
}
function hasGeminiKey() {
    return !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here');
}
// API configuration constants
exports.API_CONFIG = {
    GROQ: {
        MODEL: 'whisper-large-v3-turbo',
        MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB (actual Groq API limit)
        SUPPORTED_FORMATS: ['mp3', 'wav', 'm4a', 'webm', 'mp4']
    },
    GEMINI: {
        MODEL: 'gemini-2.5-flash',
        MAX_TOKENS: 8192,
        TEMPERATURE: 0.3
    }
};
// Test API connections
async function testAPIConnections() {
    const results = {
        groq: false,
        gemini: false
    };
    try {
        // Test Groq
        if (hasGroqKey()) {
            const client = initGroq();
            await client.models.list();
            results.groq = true;
            console.log('✅ Groq API connected successfully');
        }
        else {
            console.log('⚠️  Groq API key not configured');
        }
    }
    catch (error) {
        console.error('❌ Groq API connection failed:', error.message);
    }
    try {
        // Test Gemini
        if (hasGeminiKey()) {
            const client = initGemini();
            const model = client.getGenerativeModel({ model: exports.API_CONFIG.GEMINI.MODEL });
            await model.generateContent('test');
            results.gemini = true;
            console.log('✅ Gemini API connected successfully');
        }
        else {
            console.log('⚠️  Gemini API key not configured');
        }
    }
    catch (error) {
        console.error('❌ Gemini API connection failed:', error.message);
    }
    return results;
}
//# sourceMappingURL=apis.js.map