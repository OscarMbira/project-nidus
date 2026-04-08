import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff } from 'lucide-react'

export default function CallControls({
  muted,
  videoOff,
  onToggleMute,
  onToggleVideo,
  onScreenShare,
  onLeave,
  screenSharing,
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-3 bg-gray-950 border-t border-gray-800">
      <button
        type="button"
        onClick={onToggleMute}
        className={`inline-flex items-center justify-center h-12 w-12 rounded-full ${muted ? 'bg-red-600' : 'bg-gray-700'} text-white`}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>
      <button
        type="button"
        onClick={onToggleVideo}
        className={`inline-flex items-center justify-center h-12 w-12 rounded-full ${videoOff ? 'bg-red-600' : 'bg-gray-700'} text-white`}
        aria-label={videoOff ? 'Camera on' : 'Camera off'}
      >
        {videoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
      </button>
      <button
        type="button"
        onClick={onScreenShare}
        className={`inline-flex items-center justify-center h-12 w-12 rounded-full ${screenSharing ? 'bg-cyan-600' : 'bg-gray-700'} text-white`}
        aria-label="Screen share"
      >
        <MonitorUp className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onLeave}
        className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-700 text-white"
        aria-label="Leave call"
      >
        <PhoneOff className="h-5 w-5" />
      </button>
    </div>
  )
}
