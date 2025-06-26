import { useState, useEffect } from 'react';
import { Room, createLocalAudioTrack, Track } from 'livekit-client';
import './App.css';

// Import assets
import maisyLogo from './assets/maisy-logo.png';
import greenCallButton from './assets/MakeCallButton.jpg';
import redCallButton from './assets/EndCallButton.jpg';
import maisyBot from './assets/maisy-image.png';

function App() {
  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
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
  
        // Simulate a chat message from agent
        setChatMessages(prev => [...prev, { sender: participant.identity, text: "Agent is responding..." }]);
  
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
    // Prevent multiple simultaneous connection attempts
    if (connecting || connected) return;
    
    setConnecting(true);
    
    try {
      const server_url = process.env.REACT_APP_TOKEN_SERVER_URL;
      console.log("Server url:", server_url);

      // 1. Dynamically generate a unique user ID
      const userId = `user-${Math.random().toString(36).substring(2, 8)}`;

      // 2. (Optional) Fixed room, or generate room dynamically if needed
      const roomId = `room-${Math.random().toString(36).substring(2, 8)}`;

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
    } finally {
      setConnecting(false);
    }
  };

  const disconnectFromRoom = async () => {
    if (!room || connecting) return;
    
    setConnecting(true);
    
    try {
      await room.disconnect();
      setConnected(false);
      setRoom(null);
      setChatMessages([]);
      setIsSpeaking(false);
      console.log('Disconnected.');
    } catch (err) {
      console.error('Error disconnecting:', err);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="app-container">
      <div className="phone-mockup">
        <div className="logo-container">
          <img src={maisyLogo} alt="mAIsy Logo" className="logo" />
          <div className="logo-subtitle">AI Ordering System</div>
        </div>

        <div className="call-section">
          <div className="call-button-container">
            <button 
              onClick={!connected ? connectToRoom : disconnectFromRoom} 
              className={`call-button ${connecting ? 'connecting' : ''} ${!connected ? 'start-call' : 'end-call'}`}
              disabled={connecting}
            >
              <div className="call-icon">
                {!connected ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/>
                  </svg>
                )}
              </div>
              {connecting && <div className="loading-ring"></div>}
            </button>
          </div>
          
          <div className="button-label">
            {connecting ? 'CONNECTING...' : (!connected ? 'START CALL' : 'END CALL')}
          </div>

          {connected && isSpeaking && (
            <div className="speaking-indicator">
              <div className="pulse-dot"></div>
              Agent is speaking...
            </div>
          )}
        </div>

        {/* Fixed height container to prevent layout shift */}
        <div className="chat-placeholder">
          {connected && (
            <div className="chat-container">
              <div className="chat-header">Live Chat</div>
              <div className="chat-messages">
                {chatMessages.length === 0 ? (
                  <div className="no-messages">Call connected. Start speaking!</div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div key={idx} className="chat-message">
                      <span className="sender">{msg.sender}:</span> {msg.text}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bot-container">
          <img src={maisyBot} alt="mAIsy Assistant" className="bot-image" />
        </div>
      </div>
    </div>
  );
}

export default App;
