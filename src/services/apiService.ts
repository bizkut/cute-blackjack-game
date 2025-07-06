import axios, { AxiosError } from 'axios';
import { User } from '../contexts/AuthContext'; // Assuming User type is exported from AuthContext

// Define a more specific type for Axios errors if needed, or use AxiosError
type ApiError = any; // Replace with a more specific error type if desired

// Response types (examples, adjust based on actual backend responses)
interface AuthChallengeResponse {
  message: string;
}

interface VerifySignatureResponse {
  success: boolean;
  user?: User; // User object from backend
  error?: string;
  message?: string;
}

interface LogoutResponse {
  success: boolean;
  message: string;
}

interface AuthStatusResponse {
  isAuthenticated: boolean;
  user?: User; // User object from backend or a subset
}

interface UserProfileResponse extends User {} // Assuming /user/me returns the full User object

interface UpdateNicknameResponse {
  success: boolean;
  message: string;
  nickname: string;
}

interface SubmitScoreResponse {
  success: boolean;
  message: string;
  newHighScore?: number;
  currentHighScore?: number;
  existingScore?: number; // based on app.js example
}

export interface LeaderboardEntry {
  ethereum_address: string;
  nickname: string | null;
  score: number;
  achieved_at: string;
}


const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Configure axios instance for things like credentials
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for sending session cookies
});

// --- Auth Service ---
export const getAuthChallenge = async (address: string): Promise<AuthChallengeResponse> => {
  try {
    const response = await apiClient.post<AuthChallengeResponse>('/auth/challenge', { address });
    return response.data;
  } catch (error: ApiError) {
    console.error('Error getting auth challenge:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to get challenge');
  }
};

export const verifyAuthSignature = async (address: string, signature: string): Promise<VerifySignatureResponse> => {
  try {
    const response = await apiClient.post<VerifySignatureResponse>('/auth/verify', { address, signature });
    return response.data;
  } catch (error: ApiError) {
    console.error('Error verifying signature:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to verify signature');
  }
};

export const logoutUser = async (): Promise<LogoutResponse> => {
  try {
    const response = await apiClient.post<LogoutResponse>('/auth/logout');
    return response.data;
  } catch (error: ApiError) {
    console.error('Error logging out:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to logout');
  }
};

export const getAuthStatus = async (): Promise<AuthStatusResponse> => {
  try {
    const response = await apiClient.get<AuthStatusResponse>('/auth/status');
    return response.data;
  } catch (error: ApiError) {
    console.error('Error getting auth status:', error.response?.data || error.message);
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      return { isAuthenticated: false }; // Ensure this matches AuthStatusResponse
    }
    throw error.response?.data || new Error('Failed to get auth status');
  }
};

// --- User Service ---
export const getUserProfile = async (): Promise<UserProfileResponse> => {
  try {
    const response = await apiClient.get<UserProfileResponse>('/user/me');
    return response.data;
  } catch (error: ApiError) {
    console.error('Error fetching user profile:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to fetch user profile');
  }
};

export const updateUserNickname = async (nickname: string): Promise<UpdateNicknameResponse> => {
  try {
    const response = await apiClient.put<UpdateNicknameResponse>('/user/nickname', { nickname });
    return response.data;
  } catch (error: ApiError) {
    console.error('Error updating nickname:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to update nickname');
  }
};

// --- Score Service ---
export const submitScore = async (score: number): Promise<SubmitScoreResponse> => {
  try {
    const response = await apiClient.post<SubmitScoreResponse>('/score', { score });
    return response.data;
  } catch (error: ApiError) {
    console.error('Error submitting score:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to submit score');
  }
};

export const getLeaderboard = async (limit: number = 10): Promise<LeaderboardEntry[]> => {
  try {
    const response = await apiClient.get<LeaderboardEntry[]>(`/leaderboard?limit=${limit}`);
    return response.data;
  } catch (error: ApiError) {
    console.error('Error fetching leaderboard:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to fetch leaderboard');
  }
};

export default apiClient;
