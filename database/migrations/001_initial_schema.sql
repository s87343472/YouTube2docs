-- YouTube智能学习资料生成器 - 初始数据库架构
-- 创建日期: 2025-06-17

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
    monthly_quota INTEGER DEFAULT 3,
    used_quota INTEGER DEFAULT 0,
    last_quota_reset DATE DEFAULT CURRENT_DATE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 视频处理记录表
CREATE TABLE video_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    youtube_url TEXT NOT NULL,
    video_title TEXT,
    video_description TEXT,
    channel_name VARCHAR(255),
    duration INTEGER, -- 视频时长(秒)
    video_language VARCHAR(10),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    current_step VARCHAR(100),
    progress INTEGER DEFAULT 0, -- 处理进度(0-100)
    result_data JSONB, -- 完整的学习资料数据
    error_message TEXT,
    processing_start_time TIMESTAMP,
    processing_end_time TIMESTAMP,
    processing_time INTEGER, -- 实际处理时间(秒)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 知识图谱表
CREATE TABLE knowledge_graphs (
    id SERIAL PRIMARY KEY,
    video_process_id UUID REFERENCES video_processes(id) ON DELETE CASCADE,
    concepts JSONB NOT NULL, -- 概念节点数据
    relationships JSONB NOT NULL, -- 关系边数据
    metadata JSONB, -- 图谱元数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 概念表 (用于搜索和推荐)
CREATE TABLE concepts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    definition TEXT,
    category VARCHAR(100),
    related_topics TEXT[], -- 相关主题数组
    external_links JSONB, -- 外部资源链接
    usage_count INTEGER DEFAULT 1, -- 被引用次数
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 学习卡片表
CREATE TABLE study_cards (
    id SERIAL PRIMARY KEY,
    video_process_id UUID REFERENCES video_processes(id) ON DELETE CASCADE,
    card_type VARCHAR(50) NOT NULL, -- 卡片类型
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL, -- 卡片内容
    metadata JSONB, -- 元数据(难度、时间等)
    order_index INTEGER, -- 显示顺序
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户反馈表
CREATE TABLE user_feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    video_process_id UUID REFERENCES video_processes(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    feedback_type VARCHAR(50), -- 'quality', 'accuracy', 'usability', 'feature_request'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置表
CREATE TABLE system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 处理统计表
CREATE TABLE processing_stats (
    id SERIAL PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    total_videos INTEGER DEFAULT 0,
    successful_videos INTEGER DEFAULT 0,
    failed_videos INTEGER DEFAULT 0,
    avg_processing_time NUMERIC(10,2), -- 平均处理时间
    total_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    api_calls_groq INTEGER DEFAULT 0,
    api_calls_openai INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_plan ON users(plan);
CREATE INDEX idx_video_processes_user_id ON video_processes(user_id);
CREATE INDEX idx_video_processes_status ON video_processes(status);
CREATE INDEX idx_video_processes_created_at ON video_processes(created_at);
CREATE INDEX idx_video_processes_youtube_url ON video_processes(youtube_url);
CREATE INDEX idx_concepts_name ON concepts(name);
CREATE INDEX idx_concepts_category ON concepts(category);
CREATE INDEX idx_study_cards_video_process_id ON study_cards(video_process_id);
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_video_process_id ON user_feedback(video_process_id);

-- 创建全文搜索索引
CREATE INDEX idx_video_processes_title_gin ON video_processes USING GIN (to_tsvector('english', video_title));
CREATE INDEX idx_concepts_name_gin ON concepts USING GIN (to_tsvector('english', name));

-- 创建触发器用于更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_processes_updated_at BEFORE UPDATE ON video_processes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_concepts_updated_at BEFORE UPDATE ON concepts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入默认系统配置
INSERT INTO system_config (config_key, config_value, description) VALUES
('processing_limits', '{"max_duration": 3600, "max_file_size": 104857600, "concurrent_jobs": 5}', '处理限制配置'),
('api_settings', '{"groq_model": "whisper-large-v3-turbo", "openai_model": "gpt-4o", "max_retries": 3}', 'API设置'),
('user_quotas', '{"free": 3, "basic": 30, "pro": 999999, "enterprise": 999999}', '用户配额设置'),
('feature_flags', '{"knowledge_graph": true, "study_cards": true, "ai_explanations": true}', '功能开关');