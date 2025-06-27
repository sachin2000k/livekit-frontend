import React, { useState } from 'react';
import { Room, createLocalAudioTrack } from 'livekit-client';
import './PhoneCallPage.css';  // Make sure this path is correct
import maisyLogo from './assets/maisy-logo.png';
import maisyBot from './assets/maisy-image.png';

const PhoneCallPage = () => {
  console.log('PhoneCallPage rendered'); // Add this line

  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  
  // New state for form inputs
  const [clientDetails, setClientDetails] = useState({
    phoneNumber: '',
    clientName: ''
  });
  const [productDetails, setProductDetails] = useState({
    productList1: '',
    productList2: ''
  });

  const handleInputChange = (category, field, value) => {
    if (category === 'client') {
      setClientDetails(prev => ({ ...prev, [field]: value }));
    } else if (category === 'product') {
      setProductDetails(prev => ({ ...prev, [field]: value }));
    }
  };

  const makePhoneCall = async () => {
    if (connecting || connected) return;

    setConnecting(true);
    try {
      // Call the makeCall endpoint with all details
      const response = await fetch('/makeCall', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientDetails,
          productDetails
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate call');
      }

      // Continue with LiveKit room connection
      const server_url = process.env.REACT_APP_TOKEN_SERVER_URL;
      const userId = `user-${Math.random().toString(36).substring(2, 8)}`;
      const roomId = `room-${Math.random().toString(36).substring(2, 8)}`;
      const fullUrl = `${server_url}room=${roomId}&user=${userId}`;
      const resp = await fetch(fullUrl);
      const data = await resp.json();
      const token = data.token;

      const newRoom = new Room();
      await newRoom.connect(process.env.REACT_APP_LIVEKIT_WS_URL, token);

      setRoom(newRoom);
      setConnected(true);

      const micTrack = await createLocalAudioTrack();
      await newRoom.localParticipant.publishTrack(micTrack);
    } catch (err) {
      console.error('Error:', err);
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
      // Reset form inputs after disconnection
      setClientDetails({ phoneNumber: '', clientName: '' });
      setProductDetails({ productList1: '', productList2: '' });
    } catch (err) {
      console.error('Error disconnecting:', err);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="phone-call-page">
      <div className="phone-mockup">
        <div className="logo-container">
          <img src={maisyLogo} alt="mAIsy Logo" className="logo" />
          <div className="logo-subtitle">AI Ordering System</div>
        </div>

        <div className="form-container">
          <div className="form-section">
            <h3>Client Details</h3>
            <input
              type="tel"
              placeholder="Phone Number"
              value={clientDetails.phoneNumber}
              onChange={(e) => handleInputChange('client', 'phoneNumber', e.target.value)}
              disabled={connected}
            />
            <input
              type="text"
              placeholder="Client Name"
              value={clientDetails.clientName}
              onChange={(e) => handleInputChange('client', 'clientName', e.target.value)}
              disabled={connected}
            />
          </div>

          <div className="form-section">
            <h3>Product Details</h3>
            <textarea
              placeholder="Product List 1"
              value={productDetails.productList1}
              onChange={(e) => handleInputChange('product', 'productList1', e.target.value)}
              disabled={connected}
            />
            <textarea
              placeholder="Product List 2"
              value={productDetails.productList2}
              onChange={(e) => handleInputChange('product', 'productList2', e.target.value)}
              disabled={connected}
            />
          </div>
        </div>

        <div className="call-section">
          <button
            onClick={!connected ? makePhoneCall : disconnectFromRoom}
            className={`call-button ${connected ? 'active' : ''} ${connecting ? 'connecting' : ''}`}
            disabled={connecting || (!connected && (!clientDetails.phoneNumber || !clientDetails.clientName))}
          >
            {!connected ? 'Start Call' : 'End Call'}
          </button>
        </div>

        <div className="bot-container">
          <img src={maisyBot} alt="mAIsy Assistant" className="bot-image" />
        </div>
      </div>
    </div>
  );
};

export default PhoneCallPage;