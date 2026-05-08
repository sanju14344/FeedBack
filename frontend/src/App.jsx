import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Landing from './pages/Landing';
import AuthFlow from './pages/AuthFlow';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import AdminMasterDashboard from './pages/AdminMasterDashboard';
import StudentSelect from './pages/StudentSelect';
import SubjectList from './pages/SubjectList';
import FeedbackForm from './pages/FeedbackForm';
import './index.css';

// Detect mobile once at module level (no re-render needed for transition config)
const _isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;

// Transition configuration
const pageVariants = _isMobileDevice
  ? {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit:    { opacity: 0 },
    }
  : {
      initial: { opacity: 0, scale: 0.98, filter: 'blur(4px)' },
      animate: { opacity: 1, scale: 1,    filter: 'blur(0px)' },
      exit:    { opacity: 0, scale: 1.02, filter: 'blur(4px)' },
    };

const pageTransition = _isMobileDevice
  ? { duration: 0.2 }
  : { duration: 0.5, ease: [0.22, 1, 0.36, 1] };

const AnimatedRoutes = ({ theme, toggleTheme }) => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
            <Landing theme={theme} />
          </motion.div>
        } />
        <Route path="/auth" element={
          <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
            <AuthFlow theme={theme} />
          </motion.div>
        } />
        <Route path="/cr-login" element={
          <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
            <Auth theme={theme} role="CR" />
          </motion.div>
        } />
        <Route path="/admin-login" element={
          <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
            <Auth theme={theme} role="Admin" />
          </motion.div>
        } />
        <Route path="/dashboard" element={
          <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
            <Dashboard theme={theme} />
          </motion.div>
        } />
        <Route path="/admin-master" element={
          <AdminMasterDashboard theme={theme} />
        } />

        {/* Student Feedback Flow */}
        <Route path="/student" element={
          <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
            <StudentSelect theme={theme} />
          </motion.div>
        } />
        <Route path="/student/subjects" element={
          <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
            <SubjectList theme={theme} />
          </motion.div>
        } />
        <Route path="/student/feedback/:subjectId" element={
          <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
            <FeedbackForm theme={theme} />
          </motion.div>
        } />

        <Route path="*" element={<Landing theme={theme} />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  const getSystemTheme = () => 
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  const [theme, setTheme] = useState(getSystemTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <AnimatedRoutes theme={theme} />
    </BrowserRouter>
  );
}

export default App;
