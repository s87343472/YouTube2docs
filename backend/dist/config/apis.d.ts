import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
export declare let groq: Groq | null;
export declare let gemini: GoogleGenerativeAI | null;
export declare function initGroq(): Groq;
export declare function initGemini(): GoogleGenerativeAI;
export declare function hasGroqKey(): boolean;
export declare function hasGeminiKey(): boolean;
export declare const API_CONFIG: {
    GROQ: {
        MODEL: string;
        MAX_FILE_SIZE: number;
        SUPPORTED_FORMATS: string[];
    };
    GEMINI: {
        MODEL: string;
        MAX_TOKENS: number;
        TEMPERATURE: number;
    };
};
export declare function testAPIConnections(): Promise<{
    groq: boolean;
    gemini: boolean;
}>;
//# sourceMappingURL=apis.d.ts.map