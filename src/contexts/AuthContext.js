import React, { createContext, useState, useEffect, useContext } from 'react';
import { ethers } from 'ethers'; // For Metamask interaction
import * as api from '../services/apiService';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Initial loading state
  const [error, setError] = useState('');

  // Check auth status on initial load
  useEffect(() => {
    const checkCurrentUser = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.getAuthStatus();
        if (data.isAuthenticated && data.user) {
          // Optionally fetch full profile if /auth/status only returns basic info
          // For now, assume data.user from /auth/status is enough or fetch full profile
          const profile = await api.getUserProfile();
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Error checking auth status:", err);
        setUser(null);
        // setError('Could not verify authentication status.'); // Optional: display error
      } finally {
        setLoading(false);
      }
    };
    checkCurrentUser();
  }, []);

  const loginWithMetamask = async () => {
    setLoading(true);
    setError('');
    if (!window.ethereum) {
      setError("MetaMask is not installed. Please install it to continue.");
      setLoading(false);
      return;
    }

    try {
      // Request account access
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) {
        setError("No accounts found. Please connect an account in MetaMask.");
        setLoading(false);
        return;
      }
      const signerAddress = accounts[0];

      // Get challenge message from backend
      const challengeData = await api.getAuthChallenge(signerAddress);
      const messageToSign = challengeData.message;

      // Get signer
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(messageToSign);

      // Verify signature with backend
      const verifyData = await api.verifyAuthSignature(signerAddress, signature);
      if (verifyData.success && verifyData.user) {
         // Fetch full profile after successful login
        const profile = await api.getUserProfile();
        setUser(profile);
      } else {
        setError(verifyData.error || "Login failed after verification.");
        setUser(null);
      }
    } catch (err) {
      console.error("MetaMask login error:", err);
      setError(err.error || err.message || "An error occurred during MetaMask login.");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError('');
    try {
      await api.logoutUser();
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
      setError(err.message || "Logout failed.");
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh user profile data (e.g., after updating nickname or score)
  const refreshUserProfile = async () => {
    if (!user) return; // Only refresh if a user is logged in
    setLoading(true);
    try {
      const profile = await api.getUserProfile();
      setUser(profile);
    } catch (err) {
      console.error("Error refreshing user profile:", err);
      // Optionally handle error, e.g., by logging out if profile fetch fails critically
      // setError("Could not refresh user data.");
    } finally {
      setLoading(false);
    }
  };


  const value = {
    user, // This will contain { id, ethereum_address, nickname, created_at, high_score }
    isAuthenticated: !!user,
    loading,
    error,
    loginWithMetamask,
    logout,
    refreshUserProfile, // Expose refresh function
    setError // Allow components to set global errors if needed
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
