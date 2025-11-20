import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, ChevronLeft, ChevronRight, List, Bookmark, BookmarkCheck } from 'lucide-react'
import { Button } from '../ui/Button'
import { useToastContext } from '../../context/ToastContext'

export default function VideoTutorial({ 
  videoUrl, 
  title, 
  description, 
  playlist = [], 
  showPlaylist = true,
  showTranscript = false,
  transcript = '',
  onBookmark,
  bookmarked = false
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showPlaylistPanel, setShowPlaylistPanel] = useState(showPlaylist)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const toast = useToastContext()
  const controlsTimeoutRef = useRef(null)

  const currentVideo = playlist[currentVideoIndex] || { url: videoUrl, title, description }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => setCurrentTime(video.currentTime)
    const updateDuration = () => setDuration(video.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      if (currentVideoIndex < playlist.length - 1) {
        handleNext()
      }
    }

    video.addEventListener('timeupdate', updateTime)
    video.addEventListener('loadedmetadata', updateDuration)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', updateTime)
      video.removeEventListener('loadedmetadata', updateDuration)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [currentVideoIndex, playlist.length])

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.playbackRate = playbackRate
    }
  }, [playbackRate])

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    // Auto-hide controls after 3 seconds of inactivity
    if (showControls) {
      clearTimeout(controlsTimeoutRef.current)
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }

    return () => clearTimeout(controlsTimeoutRef.current)
  }, [showControls, isPlaying, currentTime])

  const handlePlayPause = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
    setIsPlaying(!isPlaying)
    setShowControls(true)
  }

  const handleSeek = (e) => {
    const video = videoRef.current
    if (!video) return

    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    video.currentTime = pos * video.duration
    setShowControls(true)
  }

  const handleVolumeChange = (e) => {
    const video = videoRef.current
    if (!video) return

    const rect = e.currentTarget.getBoundingClientRect()
    const pos = 1 - (e.clientY - rect.top) / rect.height
    const newVolume = Math.max(0, Math.min(1, pos))
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
    setShowControls(true)
  }

  const handleFullscreen = async () => {
    const container = containerRef.current
    if (!container) return

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error)
    }
  }

  const handlePrevious = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1)
      const video = videoRef.current
      if (video) {
        video.load()
      }
    }
  }

  const handleNext = () => {
    if (currentVideoIndex < playlist.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1)
      const video = videoRef.current
      if (video) {
        video.load()
      }
    }
  }

  const handlePlaylistItemClick = (index) => {
    setCurrentVideoIndex(index)
    const video = videoRef.current
    if (video) {
      video.load()
      video.play()
    }
  }

  const handleBookmark = () => {
    if (onBookmark) {
      onBookmark(currentVideo.url, !bookmarked)
      if (toast) {
        toast.success(bookmarked ? 'Bookmark removed' : 'Bookmarked')
      }
    }
  }

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-lg overflow-hidden group"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => !isPlaying && setShowControls(false)}
    >
      {/* Video Player */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <video
          ref={videoRef}
          src={currentVideo.url}
          className="absolute top-0 left-0 w-full h-full"
          onClick={handlePlayPause}
          aria-label={currentVideo.title || 'Video tutorial'}
        />

        {/* Overlay Controls */}
        {showControls && (
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center transition-opacity">
            <button
              onClick={handlePlayPause}
              className="p-4 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? (
                <Pause className="h-12 w-12 text-gray-900" />
              ) : (
                <Play className="h-12 w-12 text-gray-900 ml-1" />
              )}
            </button>
          </div>
        )}

        {/* Bottom Controls */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Progress Bar */}
          <div
            className="w-full h-1 bg-white bg-opacity-30 rounded-full mb-4 cursor-pointer group/progress"
            onClick={handleSeek}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const pos = (e.clientX - rect.left) / rect.width
              const video = videoRef.current
              if (video) {
                e.currentTarget.title = `Seek to ${formatTime(pos * video.duration)}`
              }
            }}
          >
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              className="text-white hover:text-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>

            {/* Volume */}
            <div className="relative group/volume">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-white hover:text-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
              <div className="absolute bottom-full left-0 mb-2 w-8 h-24 bg-black bg-opacity-80 rounded opacity-0 group-hover/volume:opacity-100 transition-opacity">
                <div
                  className="relative w-full h-full"
                  onClick={handleVolumeChange}
                >
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-full bg-white bg-opacity-30 rounded-full">
                    <div
                      className="absolute bottom-0 left-0 w-full bg-blue-500 rounded-full transition-all"
                      style={{ height: `${(isMuted ? 0 : volume) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Time */}
            <span className="text-white text-sm tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Playback Rate */}
            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
              className="ml-auto text-white bg-black bg-opacity-50 border border-white border-opacity-30 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Playback speed"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>

            {/* Playlist Toggle */}
            {playlist.length > 0 && (
              <button
                onClick={() => setShowPlaylistPanel(!showPlaylistPanel)}
                className="text-white hover:text-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label="Toggle playlist"
              >
                <List className="h-5 w-5" />
              </button>
            )}

            {/* Bookmark */}
            {onBookmark && (
              <button
                onClick={handleBookmark}
                className={`transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${
                  bookmarked
                    ? 'text-yellow-400 hover:text-yellow-300'
                    : 'text-white hover:text-blue-400'
                }`}
                aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                {bookmarked ? (
                  <BookmarkCheck className="h-5 w-5" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </button>
            )}

            {/* Navigation */}
            {playlist.length > 0 && (
              <>
                <button
                  onClick={handlePrevious}
                  disabled={currentVideoIndex === 0}
                  className="text-white hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  aria-label="Previous video"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentVideoIndex === playlist.length - 1}
                  className="text-white hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  aria-label="Next video"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="text-white hover:text-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Playlist Panel */}
      {showPlaylistPanel && playlist.length > 0 && (
        <div className="absolute top-0 right-0 bottom-0 w-80 bg-black bg-opacity-95 overflow-y-auto z-10">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold mb-2">Playlist</h3>
            <button
              onClick={() => setShowPlaylistPanel(false)}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close playlist"
            >
              ×
            </button>
          </div>
          <div className="p-2">
            {playlist.map((video, index) => (
              <button
                key={index}
                onClick={() => handlePlaylistItemClick(index)}
                className={`w-full text-left p-3 rounded mb-2 transition-colors ${
                  index === currentVideoIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Play className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{video.title}</div>
                    {video.duration && (
                      <div className="text-xs opacity-75">{video.duration}</div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Video Info */}
      {(currentVideo.title || currentVideo.description) && (
        <div className="p-4 bg-white dark:bg-gray-800">
          {currentVideo.title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {currentVideo.title}
            </h3>
          )}
          {currentVideo.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {currentVideo.description}
            </p>
          )}
        </div>
      )}

      {/* Transcript */}
      {showTranscript && transcript && (
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Transcript</h4>
          <div className="text-sm text-gray-600 dark:text-gray-400 max-h-48 overflow-y-auto">
            {transcript}
          </div>
        </div>
      )}
    </div>
  )
}

