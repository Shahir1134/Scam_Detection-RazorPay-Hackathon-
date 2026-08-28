import axios from 'axios';

const client = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || 'https://scam-detection-razorpay-hackathon.onrender.com/api/v1',
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
