import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
});

export const getDepartmentsByYear = (year) => api.get(`/departments-by-year/${year}`);
export const getSubjects = (deptId) => api.get(`/subjects/${deptId}`);
export const getStaff = (deptId) => api.get(`/staff/${deptId}`);
export const submitFeedback = (data) => api.post('/submit-feedback', data);

export const crLogin = (data) => api.post('/auth/cr-signup', data); // Maps to the backend flow
export const getCrProfile = (uid) => api.get(`/auth/cr-profile?uid=${uid}`);
export const getInsights = (dept) => api.get(`/admin/insights?dept=${dept}`);
export const getFeedbackLogs = (dept) => api.get(`/admin/feedback?dept=${dept}`);

export default api;
