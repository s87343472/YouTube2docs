import React, { useState } from 'react'
import { Play } from 'lucide-react'

interface YoutubeEmbedProps {
  videoUrl: string
  title: string
  thumbnail?: string
  className?: string
}

const YoutubeEmbed: React.FC<YoutubeEmbedProps> = ({ 
  videoUrl, 
  title, 
  thumbnail,
  className = '' 
}) => {
  const [isLoaded, setIsLoaded] = useState(false)

  // 从URL中提取视频ID
  const getVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  const videoId = getVideoId(videoUrl)
  
  if (!videoId) {
    return (
      <div className={`bg-gray-100 rounded-lg p-4 text-center ${className}`}>
        <p className="text-gray-600">无效的YouTube链接</p>
      </div>
    )
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0`
  const thumbnailUrl = thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`

  const handleLoadVideo = () => {
    setIsLoaded(true)
  }

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative w-full pb-[56.25%] bg-black rounded-lg overflow-hidden">
        {!isLoaded ? (
          // 缩略图预览，点击后加载视频
          <button
            onClick={handleLoadVideo}
            className="absolute inset-0 w-full h-full group cursor-pointer"
            aria-label={`播放视频: ${title}`}
          >
            <img
              src={thumbnailUrl}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                // 如果maxresdefault失败，尝试使用hqdefault
                const target = e.target as HTMLImageElement
                if (target.src.includes('maxresdefault')) {
                  target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                }
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center group-hover:bg-opacity-20 transition-all duration-200">
              <div className="bg-red-600 rounded-full p-4 group-hover:bg-red-700 transition-colors duration-200 shadow-lg">
                <Play className="h-8 w-8 text-white ml-1" fill="currentColor" />
              </div>
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="text-white text-sm font-medium drop-shadow-lg line-clamp-2">
                {title}
              </h3>
            </div>
          </button>
        ) : (
          // YouTube iframe
          <iframe
            src={embedUrl}
            title={title}
            className="absolute inset-0 w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        )}
      </div>
      
    </div>
  )
}

export default YoutubeEmbed