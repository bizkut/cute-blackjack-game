import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx'; // Explicitly point to App.tsx
import { AuthProvider } from './contexts/AuthContext.js'; // Ensure .js extension if it's a .js file
// import './globalStyles.tsx'; // Or your main CSS/styling entry point

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
