import React, { useState, useEffect } from 'react';
import { Room, createLocalAudioTrack, Track } from 'livekit-client';
import './CallDashboard.css';
import PhoneCallPage from './PhoneCallPage';

const CallDashboard = () => {
  const [calls, setCalls] = useState([]);
  const [selectedCallId, setSelectedCallId] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [page, setPage] = useState(0);
  const [showTestCall, setShowTestCall] = useState(false);
  const [testCallType, setTestCallType] = useState(null); // 'web' or 'phone'

  // State for Test Web Call
  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);

  // New state variables for feedback
  const [messageFeedback, setMessageFeedback] = useState({});
  const [overallFeedback, setOverallFeedback] = useState(null);
  const [commentPopup, setCommentPopup] = useState({ open: false, messageId: null });
  const [comments, setComments] = useState({});

  const [activeSection, setActiveSection] = useState('dashboard');

  // New state for client details
  const [clientDetails, setClientDetails] = useState({
    clientName: '',
    phoneNumber: '',
  });

  // Fetch the list of calls
  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const response = await fetch(`http://localhost:8000/get-call-ids?skip=${page * 10}&limit=10`);
        const data = await response.json();
        setCalls(Object.entries(data));
      } catch (error) {
        console.error('Error fetching calls:', error);
      }
    };

    fetchCalls();
  }, [page]);

  // Fetch the transcript for a selected call
  const fetchTranscript = async (callId) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/get-conversation/${callId}`);
      const rawData = await response.json();

      // Parse the JSON string if necessary
      const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

      // Safely access session_start and session_end
      const start = data.session_start?.$date ? new Date(data.session_start.$date) : null;
      const end = data.session_end?.$date ? new Date(data.session_end.$date) : null;

      let duration = null;
      if (start && end) {
        duration = Math.round((end - start) / 1000); // in seconds
      }

      setTranscript(data.session_history?.items || []);
      setAnalytics({
        userName: data.user_details?.name || 'Unknown',
        phoneNumber: data.user_details?.phone_number || 'Unknown',
        duration: duration ? `${Math.floor(duration / 60)}m ${duration % 60}s` : 'Unknown',
      });
    } catch (error) {
      console.error('Error fetching transcript:', error);
    } finally {
      setLoading(false);
    }
  };

  // Test Web Call Logic
  useEffect(() => {
    if (!room) return;

    const handleTrackSubscribed = (track) => {
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

    const handleTrackUnsubscribed = (track) => {
      if (track.kind === Track.Kind.Audio) {
        track.detach().forEach((element) => element.remove());
        setIsSpeaking(false);
      }
    };

    room.on('trackSubscribed', handleTrackSubscribed);
    room.on('trackUnsubscribed', handleTrackUnsubscribed);

    return () => {
      room.off('trackSubscribed', handleTrackSubscribed);
      room.off('trackUnsubscribed', handleTrackUnsubscribed);
    };
  }, [room]);

  const connectToRoom = async () => {
    try {
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
      console.error('Error connecting to Agent:', err);
    }
  };

  const disconnectFromRoom = async () => {
    if (room) {
      await room.disconnect();
      setConnected(false);
      setRoom(null);
      setChatMessages([]);
    }
  };

  // New function to handle feedback
  const handleFeedback = (messageId, type, feedbackType) => {
    if (type === 'message') {
      setMessageFeedback(prev => ({
        ...prev,
        [messageId]: feedbackType
      }));
    } else if (type === 'overall') {
      setOverallFeedback(feedbackType);
    }
  };

  // New function to handle comments
  const handleComment = (messageId) => {
    setCommentPopup({ open: true, messageId });
  };

  // Function to handle input changes
  const handleInputChange = (field, value) => {
    setClientDetails((prev) => ({ ...prev, [field]: value }));
  };

  const submitFeedback = async (callId) => {
    try {
      const feedbackData = {
        callId: callId,
        messageFeedback: messageFeedback,
        overallFeedback: overallFeedback,
        comments: comments
      };

      const response = await fetch('http://localhost:8000/submit-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData)
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      // Clear feedback states after successful submission
      setMessageFeedback({});
      setOverallFeedback(null);
      setComments({});
      
      // Optionally show success message
      alert('Feedback submitted successfully');
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback');
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'testPhoneCall':
        return (
          <div className="test-call-section">
            <h1>Test Phone Call</h1>
            <button
              onClick={connectToRoom}
              className="call-button"
              disabled={!clientDetails.clientName || !clientDetails.phoneNumber}
            >
              Start Call
            </button>
          </div>
        );
      // ...other cases for different sections
      default:
        return (
          <div className="call-dashboard">
            {/* Left Sidebar: Navigation */}
            <div className="sidebar">
              <h3 onClick={() => setShowTestCall(true)}>Test Call</h3>
              {showTestCall && (
                <div className="test-call-menu">
                  <div
                    className={`test-call-item ${testCallType === 'web' ? 'active' : ''}`}
                    onClick={() => setTestCallType('web')}
                  >
                    Test Web Call
                  </div>
                  <div
                    className={`test-call-item ${testCallType === 'phone' ? 'active' : ''}`}
                    onClick={() => setTestCallType('phone')}
                  >
                    Test Phone Call
                  </div>
                </div>
              )}
              <h3 onClick={() => setShowTestCall(false)}>Call List</h3>
              {!showTestCall && (
                <>
                  {calls.map(([callId, name]) => (
                    <div
                      key={callId}
                      className={`call-item ${selectedCallId === callId ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedCallId(callId);
                        fetchTranscript(callId);
                      }}
                    >
                      {name}
                    </div>
                  ))}
                  <div className="pagination">
                    <button
                      onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                      disabled={page === 0}
                    >
                      Previous
                    </button>
                    <button onClick={() => setPage((prev) => prev + 1)}>Next</button>
                  </div>
                </>
              )}
            </div>

            {/* Middle Section: Transcript or Test Call */}
            <div className="transcript-section">
              {showTestCall ? (
                testCallType === 'web' ? (
                  <div className="test-call-section">
                    <h1>AI Agent Interaction</h1>
                    {!connected ? (
                      <button onClick={connectToRoom} className="call-button">
                        Start Call
                      </button>
                    ) : (
                      <button onClick={disconnectFromRoom} className="call-button">
                        End Call
                      </button>
                    )}
                    {connected && (
                      <>
                        {isSpeaking && (
                          <div className="speaking-indicator">🔊 Agent is speaking...</div>
                        )}
                        <div className="chat-container">
                          <h3>Chat</h3>
                          <div className="chat-messages">
                            {chatMessages.map((msg, idx) => (
                              <div key={idx} className="chat-message">
                                <b>{msg.sender}:</b> {msg.text}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : testCallType === 'phone' ? (
                  <div className="test-call-section">
                    <h3>Test Phone Call</h3>
                    <div className="form-section">
                      <input
                        type="text"
                        placeholder="Client Name"
                        value={clientDetails.clientName}
                        onChange={(e) => handleInputChange('clientName', e.target.value)}
                      />
                      <input
                        type="tel"
                        placeholder="Client Phone Number"
                        value={clientDetails.phoneNumber}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      />
                    </div>
                    <button
                      onClick={connectToRoom}
                      className="call-button"
                      disabled={!clientDetails.clientName || !clientDetails.phoneNumber}
                    >
                      Start Test Phone Call
                    </button>
                  </div>
                ) : (
                  <div className="no-test-call">Select a test call type</div>
                )
              ) : selectedCallId ? (
                loading ? (
                  <div className="loading">Loading transcript...</div>
                ) : transcript && transcript.length > 0 ? (
                  <div className="transcript-container">
                    <h3>Transcript</h3>
                    <div className="transcript-chat">
                      {transcript.map((item) => (
                        <div
                          key={item.id}
                          className={`message-bubble ${item.role === 'assistant' ? 'assistant' : 'user'}`}
                        >
                          {item.content.join(' ')}
                          {item.role === 'assistant' && (
                            <div className="feedback-buttons">
                              <button
                                className={`feedback-button ${messageFeedback[item.id] === 'like' ? 'active' : ''}`}
                                onClick={() => handleFeedback(item.id, 'message', 'like')}
                              >
                                <img src="/thumbs-up.svg" alt="Like" />
                              </button>
                              <button
                                className={`feedback-button ${messageFeedback[item.id] === 'dislike' ? 'active' : ''}`}
                                onClick={() => handleFeedback(item.id, 'message', 'dislike')}
                              >
                                <img src="/thumbs-down.svg" alt="Dislike" />
                              </button>
                              <button
                                className="feedback-button"
                                onClick={() => handleComment(item.id)}
                              >
                                💬
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Feedback Footer */}
                    <div className="feedback-footer">
                      <div className="overall-feedback">
                        <span>Overall Feedback:</span>
                        <button
                          className={`feedback-button ${overallFeedback === 'like' ? 'active' : ''}`}
                          onClick={() => handleFeedback(null, 'overall', 'like')}
                        >
                          <img src="/thumbs-up.svg" alt="Like" />
                        </button>
                        <button
                          className={`feedback-button ${overallFeedback === 'dislike' ? 'active' : ''}`}
                          onClick={() => handleFeedback(null, 'overall', 'dislike')}
                        >
                          <img src="/thumbs-down.svg" alt="Dislike" />
                        </button>
                      </div>
                      <button
                        className="submit-feedback-button"
                        onClick={() => submitFeedback(selectedCallId)}
                        disabled={!overallFeedback}
                      >
                        Submit All Feedback
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="no-transcript">Select a call to view its transcript</div>
                )
              ) : (
                <div className="no-transcript">Select a call or test call to begin</div>
              )}
            </div>

            {/* Right Sidebar: Analytics */}
            <div className="analytics-section">
              <h3>Analytics</h3>
              {analytics ? (
                <div className="analytics-details">
                  <div className="analytics-item">
                    <span className="analytics-icon">👤</span>
                    <div>
                      <div className="analytics-label">User Name</div>
                      <div className="analytics-value">{analytics.userName}</div>
                    </div>
                  </div>
                  <div className="analytics-item">
                    <span className="analytics-icon">📱</span>
                    <div>
                      <div className="analytics-label">Phone Number</div>
                      <div className="analytics-value">{analytics.phoneNumber}</div>
                    </div>
                  </div>
                  <div className="analytics-item">
                    <span className="analytics-icon">⏱️</span>
                    <div>
                      <div className="analytics-label">Call Duration</div>
                      <div className="analytics-value">{analytics.duration}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-analytics">Select a call to view analytics</div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        {/* ...existing navigation code... */}
        <button
          className={`nav-button ${activeSection === 'testPhoneCall' ? 'active' : ''}`}
          onClick={() => setActiveSection('testPhoneCall')}
        >
          Test Phone Call
        </button>
        {/* ...other navigation buttons... */}
      </nav>

      <main className="dashboard-content">
        {renderContent()}
      </main>
    </div>
  );
};

export default CallDashboard;