import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// Pre-warm the backend as early as possible to wake up Render free-tier instance
const apiURL = import.meta.env.VITE_API_URL || 'https://hostelkart-backend.onrender.com';
fetch(apiURL).catch(() => {});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
