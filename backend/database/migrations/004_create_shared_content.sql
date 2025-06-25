-- 公开分享功能相关表

-- 分享内容表
CREATE TABLE shared_content (
    id SERIAL PRIMARY KEY,
    share_id VARCHAR(10) UNIQUE NOT NULL, -- 10位随机字符串
    user_id INTEGER REFERENCES users(id),
    video_process_id UUID REFERENCES video_processes(id),
    title VARCHAR(255) NOT NULL, -- 用户自定义标题
    description TEXT, -- 用户自定义描述
    tags TEXT[], -- 用户添加的标签
    is_public BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 浏览记录表
CREATE TABLE shared_content_views (
    id SERIAL PRIMARY KEY,
    share_id VARCHAR(10) REFERENCES shared_content(share_id),
    viewer_ip INET NOT NULL,
    viewer_user_agent TEXT,
    referrer TEXT,
    source VARCHAR(20) DEFAULT 'direct', -- home, profile, social, search, direct
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_duration INTEGER DEFAULT 0 -- 页面停留时间（秒）
);

-- 点赞记录表
CREATE TABLE shared_content_likes (
    id SERIAL PRIMARY KEY,
    share_id VARCHAR(10) REFERENCES shared_content(share_id),
    user_id INTEGER REFERENCES users(id),
    liker_ip INET NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(share_id, user_id), -- 同一用户只能点赞一次
    UNIQUE(share_id, liker_ip) -- 同一IP只能点赞一次
);

-- 创建索引优化查询性能
CREATE INDEX idx_shared_content_share_id ON shared_content(share_id);
CREATE INDEX idx_shared_content_user_id ON shared_content(user_id);
CREATE INDEX idx_shared_content_is_public ON shared_content(is_public);
CREATE INDEX idx_shared_content_created_at ON shared_content("createdAt");
CREATE INDEX idx_shared_content_views_share_id ON shared_content_views(share_id);
CREATE INDEX idx_shared_content_views_viewed_at ON shared_content_views(viewed_at);

-- 创建分享ID生成函数
CREATE OR REPLACE FUNCTION generate_share_id() RETURNS VARCHAR(10) AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..10 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 确保分享ID唯一性的函数
CREATE OR REPLACE FUNCTION get_unique_share_id() RETURNS VARCHAR(10) AS $$
DECLARE
    new_id VARCHAR(10);
    id_exists BOOLEAN;
BEGIN
    LOOP
        new_id := generate_share_id();
        SELECT EXISTS(SELECT 1 FROM shared_content WHERE share_id = new_id) INTO id_exists;
        EXIT WHEN NOT id_exists;
    END LOOP;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shared_content_updated_at
    BEFORE UPDATE ON shared_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();