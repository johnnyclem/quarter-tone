import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { isPluginHost } from '@quarter-tone/core';

import App from '@/App';
import { PluginHost } from '@/plugin/PluginHost';
import '@/styles/index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found in index.html');
}

if (isPluginHost()) {
  PluginHost.send({ kind: 'ready' });
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
