/**
 * 测试Gemini API连接和功能
 */
export declare function testGeminiAPI(): Promise<{
    status: string;
    message: string;
    model?: undefined;
    testResponse?: undefined;
    error?: undefined;
} | {
    status: string;
    model: string;
    testResponse: string;
    message?: undefined;
    error?: undefined;
} | {
    status: string;
    error: string;
    message?: undefined;
    model?: undefined;
    testResponse?: undefined;
}>;
/**
 * 测试Groq API连接和功能
 */
export declare function testGroqAPI(): Promise<{
    status: string;
    message: string;
    models?: undefined;
    whisperModel?: undefined;
    error?: undefined;
} | {
    status: string;
    models: number;
    whisperModel: string;
    message?: undefined;
    error?: undefined;
} | {
    status: string;
    error: string;
    message?: undefined;
    models?: undefined;
    whisperModel?: undefined;
}>;
/**
 * 测试YouTube视频信息提取（真实）
 */
export declare function testYouTubeExtraction(): Promise<{
    status: string;
    videoInfo: import("../types").VideoInfo;
    error?: undefined;
} | {
    status: string;
    error: string;
    videoInfo?: undefined;
}>;
/**
 * 生成测试学习内容
 */
export declare function testContentGeneration(): Promise<{
    status: string;
    message: string;
    content?: undefined;
    error?: undefined;
} | {
    status: string;
    content: string;
    message?: undefined;
    error?: undefined;
} | {
    status: string;
    error: string;
    message?: undefined;
    content?: undefined;
}>;
/**
 * 运行所有API测试
 */
export declare function runAllAPITests(): Promise<{
    database: any;
    apis: any;
    gemini: any;
    groq: any;
    youtube: any;
    contentGeneration: any;
    timestamp: string;
}>;
//# sourceMappingURL=apiTest.d.ts.map