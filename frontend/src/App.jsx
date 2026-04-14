import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import AuthFlow from './pages/AuthFlow';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AdminMasterDashboard from './pages/AdminMasterDashboard';
import StudentSelect from './pages/StudentSelect';
import SubjectList from './pages/SubjectList';
import FeedbackForm from './pages/FeedbackForm';
import './index.css';

function App() {
  const getSystemTheme = () => 
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  const [theme, setTheme] = useState(getSystemTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setTheme(e.matches ? 'dark' : 'light');
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing theme={theme} />} />
        <Route path="/auth" element={<AuthFlow theme={theme} />} />
        <Route path="/cr-login" element={<Login theme={theme} role="CR" />} />
        <Route path="/admin-login" element={<Login theme={theme} role="Admin" />} />
        <Route path="/dashboard" element={<Dashboard theme={theme} />} />
        <Route path="/admin-master" element={<AdminMasterDashboard theme={theme} />} />

        {/* Student Feedback Flow */}
        <Route path="/student" element={<StudentSelect theme={theme} />} />
        <Route path="/student/subjects" element={<SubjectList theme={theme} />} />
        <Route path="/student/feedback/:subjectId" element={<FeedbackForm theme={theme} />} />

        {/* Redirect unknown to landing */}
        <Route path="*" element={<Landing theme={theme} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
