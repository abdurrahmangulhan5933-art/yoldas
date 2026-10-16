import { createServerFn } from '@tanstack/react-start'
import { AccessToken } from 'livekit-server-sdk'

export const getLiveKitToken = createServerFn({ method: 'POST' })
  .validator((data: { roomName: string; participantName: string }) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    
    if (!apiKey || !apiSecret) {
      throw new Error('LiveKit API anahtarları tanımlanmamış.')
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: data.participantName,
    })
    
    at.addGrant({
      roomJoin: true,
      room: data.roomName,
      canPublish: true,
      canSubscribe: true,
    })

    return await at.toJwt()
  })