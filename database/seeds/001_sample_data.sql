-- YouTube智能学习资料生成器 - 示例数据
-- 创建日期: 2025-06-17

-- 插入测试用户
INSERT INTO users (email, password_hash, plan, monthly_quota, used_quota) VALUES
('demo@example.com', '$2b$10$rQJyxgzX8vZ8jELFYp7ZzeYzgOqKfhHlHs4y3W8uS5.5sQyBmBbOq', 'free', 3, 1),
('premium@example.com', '$2b$10$rQJyxgzX8vZ8jELFYp7ZzeYzgOqKfhHlHs4y3W8uS5.5sQyBmBbOq', 'pro', 999999, 15),
('basic@example.com', '$2b$10$rQJyxgzX8vZ8jELFYp7ZzeYzgOqKfhHlHs4y3W8uS5.5sQyBmBbOq', 'basic', 30, 8);

-- 插入示例视频处理记录
INSERT INTO video_processes (id, user_id, youtube_url, video_title, channel_name, duration, video_language, status, progress, result_data, processing_time) VALUES
(
    'demo-123e4567-e89b-12d3-a456-426614174000',
    1,
    'https://www.youtube.com/watch?v=demo123',
    'React Hooks Complete Tutorial - useState, useEffect, useContext',
    'Programming with Mosh',
    5130, -- 85分30秒
    'en',
    'completed',
    100,
    '{
        "videoInfo": {
            "title": "React Hooks Complete Tutorial - useState, useEffect, useContext",
            "channel": "Programming with Mosh",
            "duration": "1:25:30",
            "views": "1.2M",
            "url": "https://www.youtube.com/watch?v=demo123"
        },
        "summary": {
            "keyPoints": [
                "React Hooks是函数组件中使用状态和生命周期的方式",
                "useState用于管理组件内部状态",
                "useEffect用于处理副作用，如API调用和订阅",
                "useContext用于在组件树中共享状态",
                "自定义Hook可以复用状态逻辑"
            ],
            "learningTime": "45-60分钟",
            "difficulty": "intermediate",
            "concepts": [
                {"name": "useState", "explanation": "状态Hook，用于在函数组件中添加状态"},
                {"name": "useEffect", "explanation": "副作用Hook，用于处理副作用操作"},
                {"name": "useContext", "explanation": "上下文Hook，用于消费React Context"},
                {"name": "自定义Hook", "explanation": "可复用的状态逻辑封装"}
            ]
        },
        "structuredContent": {
            "chapters": [
                {
                    "title": "React Hooks 介绍",
                    "timeRange": "00:00-15:30",
                    "keyPoints": [
                        "Hooks的设计理念和优势",
                        "函数组件vs类组件",
                        "Hooks的基本规则"
                    ]
                },
                {
                    "title": "useState Hook详解",
                    "timeRange": "15:30-35:00",
                    "keyPoints": [
                        "useState的基本用法",
                        "状态更新的异步特性",
                        "函数式更新和对象状态"
                    ]
                }
            ]
        }
    }',
    125
),
(
    'demo-234e5678-f90c-23e4-b567-537725285111',
    2,
    'https://www.youtube.com/watch?v=demo456',
    'Python Data Analysis with Pandas',
    'Data Science Tutorials',
    2700, -- 45分钟
    'en',
    'completed',
    100,
    '{
        "videoInfo": {
            "title": "Python Data Analysis with Pandas",
            "channel": "Data Science Tutorials",
            "duration": "45:00",
            "views": "856K",
            "url": "https://www.youtube.com/watch?v=demo456"
        },
        "summary": {
            "keyPoints": [
                "Pandas是Python中最重要的数据分析库",
                "DataFrame是Pandas的核心数据结构",
                "数据清洗和预处理是数据分析的关键步骤",
                "聚合和分组操作可以快速获得数据洞察",
                "可视化帮助理解数据模式"
            ],
            "learningTime": "60-75分钟",
            "difficulty": "intermediate",
            "concepts": [
                {"name": "DataFrame", "explanation": "Pandas中的二维表格数据结构"},
                {"name": "数据清洗", "explanation": "处理缺失值、异常值的过程"},
                {"name": "聚合操作", "explanation": "对数据进行分组和统计计算"},
                {"name": "数据可视化", "explanation": "用图表展示数据的方法"}
            ]
        }
    }',
    98
);

-- 插入示例概念数据
INSERT INTO concepts (name, definition, category, related_topics, external_links, usage_count) VALUES
('React Hooks', 'React 16.8引入的新特性，让你可以在不编写class的情况下使用state以及其他的React特性', 'Frontend', 
 ARRAY['React', 'JavaScript', 'Frontend Development'], 
 '{"official_docs": "https://reactjs.org/docs/hooks-intro.html", "tutorial": "https://reactjs.org/tutorial/tutorial.html"}', 
 15),
('useState', 'React Hook，用于在函数组件中添加状态管理功能', 'Frontend',
 ARRAY['React', 'State Management', 'Hooks'],
 '{"official_docs": "https://reactjs.org/docs/hooks-state.html"}',
 12),
('Pandas', 'Python数据分析库，提供高性能、易用的数据结构和数据分析工具', 'Data Science',
 ARRAY['Python', 'Data Analysis', 'Data Science'],
 '{"official_docs": "https://pandas.pydata.org/docs/", "tutorial": "https://pandas.pydata.org/docs/getting_started/index.html"}',
 8),
('DataFrame', 'Pandas中的二维标记数据结构，类似于电子表格或SQL表', 'Data Science',
 ARRAY['Pandas', 'Python', 'Data Structure'],
 '{"official_docs": "https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.html"}',
 6);

-- 插入示例学习卡片
INSERT INTO study_cards (video_process_id, card_type, title, content, metadata, order_index) VALUES
(
    'demo-123e4567-e89b-12d3-a456-426614174000',
    'concept_overview',
    'React Hooks 核心概念',
    '{"concepts": ["useState - 状态管理", "useEffect - 副作用处理", "useContext - 上下文消费", "自定义Hook - 逻辑复用"], "summary": "React Hooks让函数组件拥有了类组件的所有能力"}',
    '{"difficulty": "intermediate", "estimatedTime": "15分钟"}',
    1
),
(
    'demo-123e4567-e89b-12d3-a456-426614174000',
    'mastery_checklist',
    '学习掌握检查清单',
    '["能说出Hooks解决的问题", "会使用useState管理状态", "理解useEffect的执行时机", "能写出简单的自定义Hook"]',
    '{"nextSteps": ["尝试重构类组件", "学习useReducer和useContext"]}',
    2
);

-- 插入示例用户反馈
INSERT INTO user_feedback (user_id, video_process_id, rating, feedback_text, feedback_type) VALUES
(1, 'demo-123e4567-e89b-12d3-a456-426614174000', 5, '生成的学习资料非常详细，知识图谱很有帮助！', 'quality'),
(2, 'demo-234e5678-f90c-23e4-b567-537725285111', 4, '处理速度很快，但希望能支持更多编程语言的视频', 'feature_request'),
(1, 'demo-123e4567-e89b-12d3-a456-426614174000', 5, '学习卡片设计得很棒，方便复习', 'usability');

-- 插入示例统计数据
INSERT INTO processing_stats (date, total_videos, successful_videos, failed_videos, avg_processing_time, total_users, new_users, api_calls_groq, api_calls_openai) VALUES
(CURRENT_DATE - INTERVAL '1 day', 45, 42, 3, 127.5, 156, 12, 42, 84),
(CURRENT_DATE - INTERVAL '2 days', 38, 36, 2, 134.2, 144, 8, 36, 72),
(CURRENT_DATE - INTERVAL '3 days', 52, 48, 4, 119.8, 136, 15, 48, 96);