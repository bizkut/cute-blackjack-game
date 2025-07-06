import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Import without .tsx extension
import { AuthProvider } from './contexts/AuthContext'; // Import without .js extension, will resolve to .tsx
// import './globalStyles.tsx'; // Or your main CSS/styling entry point

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
