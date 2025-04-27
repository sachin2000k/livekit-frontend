import { AccessToken, VideoGrant } from 'livekit-server-sdk';

export default async function handler(req, res) {
  const { room, user } = req.query;

  if (!room || !user) {
    return res.status(400).json({ error: 'Missing room or user parameter' });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: user,
  });

  at.addGrant(
    new VideoGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
    })
  );

  const token = at.toJwt();

  res.status(200).json({ token });
}
