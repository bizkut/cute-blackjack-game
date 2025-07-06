// Using axios for making HTTP requests, but fetch() can also be used.
// Make sure to install axios if you choose to use it: npm install axios or yarn add axios
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Configure axios instance for things like credentials
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for sending session cookies
});

// --- Auth Service ---
export const getAuthChallenge = async (address) => {
  try {
    const response = await apiClient.post('/auth/challenge', { address });
    return response.data; // { message: "Challenge message..." }
  } catch (error) {
    console.error('Error getting auth challenge:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to get challenge');
  }
};

export const verifyAuthSignature = async (address, signature) => {
  try {
    const response = await apiClient.post('/auth/verify', { address, signature });
    return response.data; // { success: true, user: { id, address, nickname } }
  } catch (error) {
    console.error('Error verifying signature:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to verify signature');
  }
};

export const logoutUser = async () => {
  try {
    const response = await apiClient.post('/auth/logout');
    return response.data; // { success: true, message: "Logged out" }
  } catch (error) {
    console.error('Error logging out:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to logout');
  }
};

export const getAuthStatus = async () => {
  try {
    const response = await apiClient.get('/auth/status');
    return response.data; // { isAuthenticated: true/false, user?: { id, address, nickname } }
  } catch (error) {
    console.error('Error getting auth status:', error.response?.data || error.message);
    // If 401 or other errors, treat as not authenticated
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        return { isAuthenticated: false };
    }
    throw error.response?.data || new Error('Failed to get auth status');
  }
};

// --- User Service ---
export const getUserProfile = async () => {
  try {
    const response = await apiClient.get('/user/me');
    return response.data; // { id, ethereum_address, nickname, created_at, high_score: { score, achieved_at } }
  } catch (error) {
    console.error('Error fetching user profile:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to fetch user profile');
  }
};

export const updateUserNickname = async (nickname) => {
  try {
    const response = await apiClient.put('/user/nickname', { nickname });
    return response.data; // { success: true, message: "...", nickname: "..." }
  } catch (error) {
    console.error('Error updating nickname:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to update nickname');
  }
};

// --- Score Service ---
export const submitScore = async (score) => {
  try {
    const response = await apiClient.post('/score', { score });
    return response.data; // { success: true, message: "...", newHighScore?: score }
  } catch (error) {
    console.error('Error submitting score:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to submit score');
  }
};

export const getLeaderboard = async (limit = 10) => {
  try {
    const response = await apiClient.get(`/leaderboard?limit=${limit}`);
    return response.data; // [{ ethereum_address, nickname, score, achieved_at }, ...]
  } catch (error) {
    console.error('Error fetching leaderboard:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to fetch leaderboard');
  }
};

export default apiClient;
