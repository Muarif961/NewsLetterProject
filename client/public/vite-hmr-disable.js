// This script COMPLETELY disables Vite's HMR and prevents auto-refreshes
// Uses multiple strategies to ensure no reconnections or refreshes
window.addEventListener('DOMContentLoaded', () => {
  console.log('[HMR] Aggressive HMR disable script loaded');
  
  // Strategy 1: Completely replace WebSocket to prevent any HMR connections
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function(url, ...args) {
    // Block all Vite HMR connections completely
    if (url.includes('vite') || url.includes('hmr') || url.includes('__vite') || url.includes('ws')) {
      console.log(`[HMR] Blocked WebSocket connection to: ${url}`);
      
      // Return a dummy WebSocket that doesn't actually connect
      const dummySocket = {
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        send: () => {},
        close: () => {},
        readyState: 1, // OPEN
        onopen: null,
        onclose: null,
        onerror: null,
        onmessage: null,
        protocol: '',
        extensions: '',
        bufferedAmount: 0,
        binaryType: 'blob',
        url: url
      };
      
      // Simulate a successful connection after a brief delay
      setTimeout(() => {
        if (typeof dummySocket.onopen === 'function') {
          dummySocket.onopen({ target: dummySocket });
        }
      }, 50);
      
      return dummySocket;
    }
    
    // Allow non-Vite WebSockets to function normally
    return new OriginalWebSocket(url, ...args);
  };
  
  // Maintain prototype chain
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  
  // Strategy 2: Intercept and disable HMR-specific code
  if (window.__vite_plugin_react_preamble_installed__) {
    window.__vite_plugin_react_preamble_installed__ = false;
  }

  // Strategy 3: Intercept and disable Vite's hot module replacement API
  if (import.meta && import.meta.hot) {
    const originalHot = import.meta.hot;
    
    // Replace the hot module API with non-functioning version
    import.meta.hot = {
      accept: () => {},
      prune: () => {},
      dispose: () => {},
      invalidate: () => {},
      decline: () => {},
      data: {},
      on: () => {},
      send: () => {}
    };
    
    console.log('[HMR] Disabled Vite HMR API');
  }
  
  // Strategy 4: Prevent page refreshes via history API
  const originalHistoryPushState = history.pushState;
  history.pushState = function(...args) {
    if (args[2] && typeof args[2] === 'string' && args[2].includes('vite')) {
      console.log('[HMR] Blocked history navigation to Vite URL');
      return;
    }
    return originalHistoryPushState.apply(this, args);
  };
  
  // Strategy 5: Add event listeners to detect and prevent automatic reconnections
  window.addEventListener('beforeunload', (e) => {
    // Only prevent Vite-triggered refreshes, not user navigation
    if (document.visibilityState === 'visible' && 
        performance.now() > 10000 && // Don't block initial page load refreshes
        !e.isTrusted) {
      console.log('[HMR] Prevented page refresh');
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  });
  
  console.log('[HMR] All automatic refresh mechanisms have been disabled');
});