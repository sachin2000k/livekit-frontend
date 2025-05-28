import { useState, useEffect } from 'react';
import { Room, createLocalAudioTrack, Track } from 'livekit-client';
import backgroundImage from './assets/background.png';
import logoImage from './assets/logo.svg';
import maisyImage from './assets/floater.png';
import call from './assets/call.svg'

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

    room.on('trackSubscribed', handleTrackSubscribed);
    room.on('trackUnsubscribed', handleTrackUnsubscribed);
    room.on('dataReceived', handleDataReceived);

    return () => {
      room.off('trackSubscribed', handleTrackSubscribed);
      room.off('trackUnsubscribed', handleTrackUnsubscribed);
      room.off('dataReceived', handleDataReceived);
    };
  }, [room]);

  const connectToRoom = async () => {
    try {
      const server_url = process.env.REACT_APP_TOKEN_SERVER_URL;
      console.log("Server url:", server_url);

      const userId = `user-${Math.random().toString(36).substring(2, 8)}`;
      const roomId = `room-${Math.random().toString(36).substring(2, 8)}`;
      const fullUrl = `${server_url}room=${roomId}&user=${userId}`;
      
      console.log("Final URL:", fullUrl);
      
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
    <div style={{
      textAlign: 'center',
      backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.1)), url(${backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backdropFilter: 'blur(2px)',
      minHeight: '100vh',
      width: '100%',
      position: 'fixed',
      top: 0,
      left: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <img 
        src={maisyImage} 
        alt="Floating Maisy"
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          maxWidth: '150px',
          marginBottom: '30px',
          height: 'auto',
          zIndex: 1000,
          animation: 'float 3s ease-in-out infinite',
        }}
      />
      <style>
        {`
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }
        `}
      </style>
      
      <div style={{
        backgroundColor: 'transparent',
        borderRadius: '15px',
        padding: '50px', 
        maxWidth: '1240px', 
        width: '40%', 
        height: '240px', 
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(5px)',
        textAlign: 'center',
        margin: '40px auto' 
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src={logoImage} 
            alt="Maisy Logo"
            style={{
              maxWidth: '200px',
              height: 'auto',
              marginBottom: '20px',
            }}
          />
          <h1 style={{
            color: 'white',
            marginTop: '-10px',
            font: '17px ABeeZee, sans-serif',
            fontWeight: `normal`,
            letterSpacing: `3px`,
          }}>AI Ordering System</h1>
        </div>
        
        {!connected ? (
          <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', marginTop: '36px'}} onClick={connectToRoom}>
            <img src={call} alt="Maisy Logo" style={{ width: '74px', height: '74px' }} />
            <h1 style={{
            color: 'white',
            marginTop: '-10px',
            font: '17px ABeeZee, sans-serif',
            fontWeight: `normal`,
            letterSpacing: `3px`,
          }}> Start Call </h1>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', marginTop: '36px'}} onClick={disconnectFromRoom}>
          <img src={call} alt="Maisy Logo" style={{ width: '74px', height: '74px' }} />
          <h1 style={{
            color: 'white',
            marginTop: '-10px',
            font: '17px ABeeZee, sans-serif',
            fontWeight: `normal`,
            letterSpacing: `3px`,
          }}> End Call </h1>
        </div>
          
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
              width: '600px', 
              marginLeft: 'auto',
              marginRight: 'auto',
              padding: '20px',
              textAlign: 'left',
              backgroundColor: 'rgba(255, 255, 255, 0.9)'
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
    </div>
  );
}

export default App;