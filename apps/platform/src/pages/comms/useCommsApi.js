import { useMemo } from 'react'
import { useIsSimulator } from './useIsSimulator'
import * as channelPlat from '../../services/communications/channelService'
import * as channelSim from '../../services/sim/communications/simChannelService'
import * as messagePlat from '../../services/communications/messageService'
import * as messageSim from '../../services/sim/communications/simMessageService'
import * as meetingPlat from '../../services/communications/meetingService'
import * as meetingSim from '../../services/sim/communications/simMeetingService'

export function useCommsApi() {
  const isSim = useIsSimulator()
  return useMemo(
    () => ({
      isSim,
      channel: isSim ? channelSim : channelPlat,
      message: isSim ? messageSim : messagePlat,
      meeting: isSim ? meetingSim : meetingPlat,
    }),
    [isSim]
  )
}
