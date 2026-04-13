import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import AuthFlow from './pages/AuthFlow';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AdminMasterDashboard from './pages/AdminMasterDashboard';
import './index.css';

function App() {
  const [theme, setTheme] = useState('light');

  // Sync theme with document object so we can use data-theme for CSS
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/auth" element={<AuthFlow theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/cr-login" element={<Login theme={theme} toggleTheme={toggleTheme} role="CR" />} />
        <Route path="/admin-login" element={<Login theme={theme} toggleTheme={toggleTheme} role="Admin" />} />
        <Route path="/dashboard" element={<Dashboard theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/admin-master" element={<AdminMasterDashboard theme={theme} toggleTheme={toggleTheme} />} />
        {/* Redirect unknown to landing */}
        <Route path="*" element={<Landing theme={theme} toggleTheme={toggleTheme} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
