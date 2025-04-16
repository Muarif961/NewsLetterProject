import { useEffect } from "react";
import { useRoute } from "wouter";

declare global {
  interface Window {
    NewsletterWidget: {
      init: (config: any) => void;
    };
  }
}

export default function Subscribe() {
  const [match, params] = useRoute("/subscribe/:userId");

  useEffect(() => {
    if (!match || !params?.userId) return;

    const container = document.getElementById('newsletter-widget-container');
    if (!container) {
      console.error('Widget container not found');
      return;
    }

    // Load widget script
    const script = document.createElement('script');
    script.src = '/widget.js';
    script.async = true;

    script.onload = () => {
      console.log('Widget script loaded, initializing...');
      if (window.NewsletterWidget && typeof window.NewsletterWidget.init === 'function') {
        window.NewsletterWidget.init({
          userId: params.userId,
          containerId: 'newsletter-widget-container',
          styles: {
            textColor: '#333333',
            backgroundColor: '#ffffff',
            borderColor: '#d1d5db',
            borderRadius: 8,
            buttonBackgroundColor: '#2563eb',
            buttonTextColor: '#ffffff',
            fontSize: '16px',
            padding: '20px',
            width: '100%',
            maxWidth: '500px'
          }
        });
      } else {
        console.error('Newsletter widget failed to load properly');
        container.innerHTML = '<p style="color: red; text-align: center;">Failed to load the subscription form. Please refresh the page.</p>';
      }
    };

    script.onerror = (error) => {
      console.error('Failed to load widget script:', error);
      container.innerHTML = '<p style="color: red; text-align: center;">Failed to load the subscription form. Please try again later.</p>';
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [match, params]);

  if (!match) return null;

  return (
    <div id="newsletter-widget-container" style={{
      maxWidth: '500px',
      margin: '2rem auto',
      padding: '1rem',
      minHeight: '300px', 
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}></div>
  );
}