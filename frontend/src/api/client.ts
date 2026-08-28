import axios from 'axios';

const rawBaseURL = (import.meta as any).env?.VITE_API_URL || 'https://scam-detection-razorpay-hackathon.onrender.com';
const baseURL = rawBaseURL.endsWith('/api/v1') 
  ? rawBaseURL 
  : `${rawBaseURL.replace(/\/+$/, '')}/api/v1`;

const client = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});




client.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default client;
