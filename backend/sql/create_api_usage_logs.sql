-- 创建API使用日志表
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,  -- 'groq', 'gemini', etc.
    operation VARCHAR(100) NOT NULL, -- 'transcription', 'text_generation', etc.
    audio_seconds INTEGER DEFAULT 0, -- 用于音频转录的秒数
    tokens INTEGER DEFAULT 0,        -- 用于文本生成的token数
    cost DECIMAL(10, 6) DEFAULT 0,   -- 估算成本（美元）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_api_usage_provider_created ON api_usage_logs (provider, created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage_logs (created_at);

-- 添加表注释
COMMENT ON TABLE api_usage_logs IS 'API使用情况日志表';
COMMENT ON COLUMN api_usage_logs.provider IS 'API提供商：groq, gemini等';
COMMENT ON COLUMN api_usage_logs.operation IS '操作类型：transcription, text_generation等';
COMMENT ON COLUMN api_usage_logs.audio_seconds IS '音频转录使用的秒数';
COMMENT ON COLUMN api_usage_logs.tokens IS '文本生成使用的token数';
COMMENT ON COLUMN api_usage_logs.cost IS '估算成本（美元）';