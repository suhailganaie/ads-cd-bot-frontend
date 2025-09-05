import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/App.css';
import App from './App';

// Mount React into the root div created in public/index.html
const container = document.getElementById('root');
const root = createRoot(container);

// Keep index minimal; all app logic/UI lives in App.jsx
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
