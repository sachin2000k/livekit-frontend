import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import CallDashboard from './CallDashboard';
import PhoneCallPage from './PhoneCallPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<CallDashboard />} />
        {/* <Route path="/test-call" element={<PhoneCallPage />} /> */}
      </Routes>
    </Router>
  );
}

export default App;
