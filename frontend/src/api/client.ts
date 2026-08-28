import axios from 'axios';

const client = axios.create({
  baseURL: 'https://scam-detection-razorpay-hackathon.onrender.com',
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
