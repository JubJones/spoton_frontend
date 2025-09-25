// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter
import App from './App.tsx';
import './index.css';
import { monitoring } from './utils/monitoring';
import { CameraConfigProvider } from './context/CameraConfigContext';

// Initialize monitoring for production environments
if (import.meta.env.PROD || import.meta.env.VITE_ENVIRONMENT === 'staging') {
  monitoring.initialize();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Wrap your App component with BrowserRouter */}
    <BrowserRouter>
      <CameraConfigProvider>
        <App />
      </CameraConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
);
