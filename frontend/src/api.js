import axios from 'axios';

// In dev: uses localhost:3000. In production: uses /api which reroutes in Vercel
const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api');

const api = axios.create({
  baseURL: API_URL,
});

export const getDepartmentsByYear = (year) => api.get(`/departments-by-year/${year}`);
export const getSubjects = (deptId, year) => api.get(`/subjects/${deptId}${year ? `?year=${year}` : ''}`);
export const getStaff = (deptId) => api.get(`/staff/${deptId}`);
export const submitFeedback = (data) => api.post('/submit-feedback', data);

export const crSignup = (data) => api.post('/auth/cr-signup', data); // Uses new real signup
export const crLogin = (data) => api.post('/auth/cr-login', data);
export const getCrProfile = (uid) => api.get(`/auth/cr-profile?uid=${uid}`);
export const getInsights = (deptId, sessionId = '', year = '') => api.get(`/admin/insights?dept_id=${deptId}${sessionId ? `&session_id=${sessionId}` : ''}${year ? `&year=${year}` : ''}`);
export const getFeedbackLogs = (deptId, sessionId = '', year = '') => api.get(`/admin/feedback?dept_id=${deptId}${sessionId ? `&session_id=${sessionId}` : ''}${year ? `&year=${year}` : ''}`);
export const sendChatQuery = (deptId, sessionId, message, year = '') => api.post(`/admin/chat`, { dept_id: deptId, session_id: sessionId, message, year });
export const getSubmittedSubjects = (studentUid, deptId) =>
  api.get(`/submitted-subjects?student_uid=${studentUid}&dept_id=${deptId}`);
export const getCRs = () => api.get('/admin/crs');
export const approveCR = (id) => api.post('/admin/cr/approve', { id });
export const rejectCR = (id) => api.post('/admin/cr/reject', { id });

// Management
export const createStaff = (data) => api.post('/admin/staff', data);
export const updateStaff = (id, data) => api.put(`/admin/staff/${id}`, data);
export const deleteStaff = (id) => api.delete(`/admin/staff/${id}`);
export const createSubject = (data) => api.post('/admin/subjects', data);
export const updateSubject = (id, data) => api.put(`/admin/subjects/${id}`, data);
export const deleteSubject = (id) => api.delete(`/admin/subjects/${id}`);

// Session Control
export const startSession  = (data) => api.post('/admin/session/start', data);
export const endSession    = (data) => api.post('/admin/session/end', data);
export const getSessionStatus = (deptId) => api.get(`/session-status?dept_id=${deptId}`);
export const getSessionHistory = (deptId) => api.get(`/admin/session/history?dept_id=${deptId}`);

export default api;
