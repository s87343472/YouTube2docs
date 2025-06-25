// User types
export interface User {
  id: number
  email: string
  password_hash: string
  plan: 'free' | 'basic' | 'pro' | 'enterprise'
  monthly_quota: number
  used_quota: number
  createdAt: Date
  updatedAt: Date
}

// Video processing types
export interface VideoProcess {
  id: string
  user_id?: number
  youtube_url: string
  video_title?: string
  video_description?: string
  channel_name?: string
  duration?: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result_data?: LearningMaterial
  error_message?: string
  processing_time?: number
  createdAt: Date
  updatedAt: Date
}

// Learning material structure
export interface LearningMaterial {
  videoInfo: VideoInfo
  transcription?: TranscriptionResult
  summary: Summary
  structuredContent: StructuredContent
  knowledgeGraph: KnowledgeGraph
  studyCards: StudyCard[]
}

export interface VideoInfo {
  title: string
  channel: string
  duration: string
  views?: string
  url: string
  thumbnail?: string
  description?: string
}

export interface Summary {
  keyPoints: string[]
  learningTime: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  concepts: Concept[]
}

export interface Concept {
  name: string
  explanation: string
  aiExplanation?: string
  relatedLinks?: string[]
  examples?: string[]
}

export interface StructuredContent {
  overview?: string
  chapters: Chapter[]
  learningObjectives?: string[]
  prerequisites?: string[]
}

export interface Chapter {
  title: string
  timeRange: string
  keyPoints: string[]
  concepts: string[]
  practicalApplications?: string[]
  detailedExplanation?: string
  examples?: string[]
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  metadata?: {
    totalNodes: number
    totalEdges: number
    complexity: number
    coverage: number
    learningPath: string[]
    coreconcepts: string[]
    generatedAt: string
  }
}

export interface KnowledgeNode {
  id: string
  label: string
  type: 'concept' | 'skill' | 'fact' | 'process' | 'application'
  description: string
  importance: number
  complexity: number
  prerequisites?: string[]
  applications?: string[]
  relatedTerms?: string[]
  timeRange?: string
  examples?: string[]
}

export interface KnowledgeEdge {
  id: string
  source: string
  target: string
  type: 'prerequisite' | 'supports' | 'applies_to' | 'extends' | 'conflicts' | 'similar'
  strength: number
  description: string
  bidirectional?: boolean
}

export interface StudyCard {
  id: string
  type: 'concept' | 'definition' | 'example' | 'question' | 'summary' | 'application'
  title: string
  content: string
  relatedConcepts: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedTime: number
  timeReference?: string
}

// API request/response types
export interface ProcessVideoRequest {
  youtubeUrl: string
  options?: {
    language?: string
    outputFormat?: 'concise' | 'standard' | 'detailed'
    includeTimestamps?: boolean
  }
}

export interface ProcessVideoResponse {
  processId: string
  status: 'accepted'
  estimatedTime: number
  message: string
}

export interface VideoStatusResponse {
  processId: string
  status: VideoProcess['status']
  progress: number
  currentStep?: string
  estimatedTimeRemaining?: number
  error?: string
}

export interface VideoResultResponse {
  processId: string
  status: VideoProcess['status']
  result?: LearningMaterial
  processingTime?: number
  progress?: number
  currentStep?: string
  error?: string
  message?: string
  downloadUrls?: {
    pdf?: string
    markdown?: string
    json?: string
  }
}

// Processing steps
export interface ProcessingStep {
  id: string
  name: string
  description: string
  estimatedDuration: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  startTime?: Date
  endTime?: Date
  error?: string
}

// Audio processing
export interface AudioExtractionResult {
  audioPath: string
  duration: number
  format: string
  size: number
}

export interface TranscriptionResult {
  text: string
  language: string
  confidence: number
  segments?: TranscriptionSegment[]
}

export interface TranscriptionSegment {
  start: number
  end: number
  text: string
  confidence: number
}

// 公开分享相关类型
export interface SharedContent {
  id: string
  shareId: string // 10位随机字符串 
  userId: string
  videoInfo: VideoInfo
  learningMaterial: LearningMaterial
  isPublic: boolean
  createdAt: string
  updatedAt: string
  viewCount: number
  likeCount: number
  title: string // 用户自定义标题
  description?: string // 用户自定义描述
  tags: string[] // 用户添加的标签
}

export interface SharedContentView {
  id: string
  shareId: string
  viewerIP: string
  viewerUserAgent: string
  referrer?: string
  viewedAt: string
  source: 'home' | 'profile' | 'social' | 'search' | 'direct'
}

export interface SharedContentAnalytics {
  shareId: string
  totalViews: number
  uniqueViews: number
  dailyViews: { date: string; views: number }[]
  topReferrers: { source: string; count: number }[]
  averageViewTime: number
  lastViewedAt: string
}

// Error types
export interface APIError {
  code: string
  message: string
  details?: any
  statusCode: number
}

// Configuration types
export interface ProcessingConfig {
  maxDuration: number
  supportedFormats: string[]
  qualitySettings: {
    audio: {
      sampleRate: number
      channels: number
      bitrate: string
    }
    processing: {
      timeout: number
      retryAttempts: number
    }
  }
}