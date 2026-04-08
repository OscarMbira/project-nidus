import { useParams, useNavigate, Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import AgoraRTC from 'agora-rtc-sdk-ng'
import { useAppRoutePrefix } from '../../hooks/useAppRoutePrefix'
import { fetchAgoraRtcToken } from '../../services/communications/agoraTokenService'
import { useCommsApi } from './useCommsApi'
import VideoGrid from '../../components/comms/VideoGrid'
import CallControls from '../../components/comms/CallControls'

const APP_ID = import.meta.env.VITE_AGORA_APP_ID || ''

export default function MeetingRoom() {
  const { meetingId } = useParams()
  const navigate = useNavigate()
  const basePath = `${useAppRoutePrefix()}/comms`
  const { meeting } = useCommsApi()
  const [row, setRow] = useState(null)
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [screenSharing, setScreenSharing] = useState(false)
  const [err, setErr] = useState(null)
  const localVideoRef = useRef(null)
  const clientRef = useRef(null)
  const tracksRef = useRef({ audio: null, video: null })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await meeting.getMeeting(meetingId)
      if (cancelled) return
      if (error) setErr(error.message)
      setRow(data)
    })()
    return () => {
      cancelled = true
    }
  }, [meeting, meetingId])

  useEffect(() => {
    if (!row?.agora_channel_name || !APP_ID) return
    let client = null
    ;(async () => {
      try {
        client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
        clientRef.current = client
        const uid = Math.floor(Math.random() * 100000)
        const { token, error: tErr } = await fetchAgoraRtcToken({ channelName: row.agora_channel_name, uid })
        if (tErr) {
          setErr(tErr.message || 'Token failed')
          return
        }
        await client.join(APP_ID, row.agora_channel_name, token, uid)
        const audio = await AgoraRTC.createMicrophoneAudioTrack()
        const video = await AgoraRTC.createCameraVideoTrack()
        tracksRef.current = { audio, video }
        if (localVideoRef.current) {
          video.play(localVideoRef.current, { fit: 'contain' })
        }
        await client.publish([audio, video])
      } catch (e) {
        setErr(e.message || String(e))
      }
    })()
    return () => {
      ;(async () => {
        try {
          tracksRef.current.audio?.close()
          tracksRef.current.video?.close()
          await clientRef.current?.leave()
        } catch {
          /* ignore */
        }
      })()
    }
  }, [row?.agora_channel_name])

  const toggleMute = () => {
    const a = tracksRef.current.audio
    if (a) {
      a.setMuted(!muted)
      setMuted(!muted)
    }
  }

  const toggleVideo = () => {
    const v = tracksRef.current.video
    if (v) {
      v.setMuted(!videoOff)
      setVideoOff(!videoOff)
    }
  }

  const leave = async () => {
    try {
      tracksRef.current.audio?.close()
      tracksRef.current.video?.close()
      await clientRef.current?.leave()
    } catch {
      /* ignore */
    }
    navigate(`${basePath}/meetings/${meetingId}`)
  }

  if (!APP_ID) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center text-gray-700 dark:text-gray-300">
        <p className="mb-4">Set <code className="text-cyan-600">VITE_AGORA_APP_ID</code> to enable live calls.</p>
        <Link to={`${basePath}/meetings/${meetingId}`} className="text-cyan-600">
          Back to meeting
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[80vh] bg-gray-950 text-white">
      <div className="p-3 flex justify-between items-center border-b border-gray-800">
        <h1 className="text-lg font-semibold truncate">{row?.title || 'Meeting'}</h1>
        <Link to={`${basePath}/meetings/${meetingId}`} className="text-sm text-cyan-400">
          Details
        </Link>
      </div>
      {err && <p className="text-red-400 text-sm px-3">{err}</p>}
      <VideoGrid localVideoRef={localVideoRef} remoteUsers={[]} />
      <CallControls
        muted={muted}
        videoOff={videoOff}
        screenSharing={screenSharing}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onScreenShare={() => setScreenSharing((s) => !s)}
        onLeave={leave}
      />
    </div>
  )
}
