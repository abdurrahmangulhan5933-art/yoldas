import { createServerFn } from '@tanstack/react-start';
import { AccessToken } from 'livekit-server-sdk';
import { CHANNEL_IDS } from './channels';

type TokenInput = { roomName: string; participantName: string; identity: string };

export const getLiveKitToken = createServerFn({ method: 'POST' })
  .inputValidator((data: TokenInput): TokenInput => {
    const roomName = String(data?.roomName ?? '');
    const participantName = String(data?.participantName ?? '').trim().slice(0, 60);
    const identity = String(data?.identity ?? '').slice(0, 80);
    if (!(CHANNEL_IDS as readonly string[]).includes(roomName)) throw new Error('Geçersiz oda.');
    if (!participantName || !identity) throw new Error('Kullanıcı bilgisi eksik.');
    return { roomName, participantName, identity };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) throw new Error('LiveKit API anahtarları tanımlanmamış.');

    const at = new AccessToken(apiKey, apiSecret, {
      identity: data.identity,
      name: data.participantName,
      ttl: '2h',
    });
    at.addGrant({ roomJoin: true, room: data.roomName, canPublish: true, canSubscribe: true });
    return await at.toJwt();
  });
