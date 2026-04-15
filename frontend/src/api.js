import axios from 'axios';

// In dev: uses localhost:3000. In production: uses /api which reroutes in Vercel
const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api');

const api = axios.create({
  baseURL: API_URL,
});

export const getDepartmentsByYear = (year) => api.get(`/departments-by-year/${year}`);
export const getSubjects = (deptId) => api.get(`/subjects/${deptId}`);
export const getStaff = (deptId) => api.get(`/staff/${deptId}`);
export const submitFeedback = (data) => api.post('/submit-feedback', data);

export const crSignup = (data) => api.post('/auth/cr-signup', data); // Uses new real signup
export const crLogin = (data) => api.post('/auth/cr-login', data);
export const getCrProfile = (uid) => api.get(`/auth/cr-profile?uid=${uid}`);
export const getInsights = (dept) => api.get(`/admin/insights?dept=${dept}`);
export const getFeedbackLogs = (dept) => api.get(`/admin/feedback?dept=${dept}`);
export const getSubmittedSubjects = (studentUid, deptId) =>
  api.get(`/submitted-subjects?student_uid=${studentUid}&dept_id=${deptId}`);
export const getCRs = () => api.get('/admin/crs');
export const approveCR = (id) => api.post('/admin/cr/approve', { id });
export const rejectCR = (id) => api.post('/admin/cr/reject', { id });

// Management
export const createStaff = (data) => api.post('/admin/staff', data);
export const deleteStaff = (id) => api.delete(`/admin/staff/${id}`);
export const createSubject = (data) => api.post('/admin/subjects', data);
export const deleteSubject = (id) => api.delete(`/admin/subjects/${id}`);

export default api;
