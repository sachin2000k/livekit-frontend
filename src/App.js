import { useState, useEffect } from 'react';
import { Room, createLocalAudioTrack, Track } from 'livekit-client';

function App() {
  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    if (!room) return;

    const handleTrackSubscribed = (track, publication, participant) => {
      console.log(`Track subscribed: ${track.kind}`);
  
      if (track.kind === Track.Kind.Audio) {
        setIsSpeaking(true);
  
        const audioElement = track.attach();
        document.body.appendChild(audioElement);
  
        audioElement.onended = () => {
          setIsSpeaking(false);
          audioElement.remove();
        };
      }
    };
  
    const handleTrackUnsubscribed = (track, publication, participant) => {
      console.log(`Track unsubscribed: ${track.kind}`);
  
      if (track.kind === Track.Kind.Audio) {
        track.detach().forEach((element) => element.remove());
        setIsSpeaking(false);
      }
    };
  
    const handleDataReceived = (payload, participant, kind) => {
      const message = new TextDecoder().decode(payload);
      console.log(`Data message received from ${participant.identity}: ${message}`);
  
      setChatMessages(prev => [...prev, { sender: participant.identity, text: message }]);
    };
  
  

    room.on('trackSubscribed', (track, publication, participant) => {
      console.log(`Track subscribed: ${track.kind}`);

      if (track.kind === Track.Kind.Audio) {
        // Start Speaking Indicator
        setIsSpeaking(true);

        const audioElement = track.attach();
        document.body.appendChild(audioElement);

        // Simulate a chat message from agent
        setChatMessages(prev => [...prev, { sender: participant.identity, text: "Agent is responding..." }]);

        // Stop indicator when audio finishes playing (estimate)
        audioElement.onended = () => {
          setIsSpeaking(false);
          audioElement.remove();
        };
      }
    });

    room.on('trackUnsubscribed', (track, publication, participant) => {
      console.log(`Track unsubscribed: ${track.kind}`);

      if (track.kind === Track.Kind.Audio) {
        track.detach().forEach((element) => element.remove());
        setIsSpeaking(false);
      }
    });

    return () => {
      room.off('trackSubscribed', handleTrackSubscribed);
      room.off('trackUnsubscribed', handleTrackUnsubscribed);
      room.off('dataReceived', handleDataReceived);
    };
  }, [room]);

  const connectToRoom = async () => {
    try {
      // const resp = await fetch(process.env.TOKEN_SERVER_URL);
      const server_url = process.env.REACT_APP_TOKEN_SERVER_URL;
      console.log("Server url:", server_url);

      // 1. Dynamically generate a unique user ID
      const userId = `user-${Math.random().toString(36).substring(2, 8)}`;

      // 2. (Optional) Fixed room, or generate room dynamically if needed
      const roomId = `room-${Math.random().toString(36).substring(2, 8)}`; // or generate your own: `room-${someUniqueId}`

      // 3. Build final URL dynamically
      const fullUrl = `${server_url}room=${roomId}&user=${userId}`;
      console.log("Final URL:", fullUrl);

      // 4. Fetch the token
      const resp = await fetch(fullUrl);
      const data = await resp.json();
      const token = data.token;

      const newRoom = new Room();
      await newRoom.connect(process.env.REACT_APP_LIVEKIT_WS_URL, token);

      setRoom(newRoom);
      setConnected(true);

      const micTrack = await createLocalAudioTrack();
      await newRoom.localParticipant.publishTrack(micTrack);

      console.log('Connected and microphone publishing.');
    } catch (err) {
      console.error('Error connecting to Agent:', err);
    }
  };

  const disconnectFromRoom = async () => {
    if (room) {
      await room.disconnect();
      setConnected(false);
      setRoom(null);
      setChatMessages([]);
      console.log('Disconnected.');
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '5%' }}>
      <h1>Voice AI Agent Interaction</h1>

      {!connected ? (
        <button onClick={connectToRoom} style={{ padding: '10px 20px', fontSize: '18px' }}>
          Start Call
        </button>
      ) : (
        <button onClick={disconnectFromRoom} style={{ padding: '10px 20px', fontSize: '18px' }}>
          End Call
        </button>
      )}

      {connected && (
        <>
          {isSpeaking && (
            <div style={{ marginTop: '20px', fontWeight: 'bold', fontSize: '20px', color: 'green' }}>
              🔊 Agent is speaking...
            </div>
          )}

          <div style={{
            marginTop: '40px',
            border: '1px solid gray',
            borderRadius: '8px',
            width: '400px',
            marginLeft: 'auto',
            marginRight: 'auto',
            padding: '20px',
            textAlign: 'left'
          }}>
            <h3>Chat</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={{ marginBottom: '10px' }}>
                  <b>{msg.sender}:</b> {msg.text}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
