/**
 * Replit Keep-Alive Service
 * 
 * Prevents Replit deployments from auto-refreshing by sending regular pings
 * to the server to keep the application active.
 */

// Configuration
const PING_INTERVAL = 3 * 60 * 1000; // 3 minutes (well under the refresh time)
const PING_URLS = [
  '/api/ping',
  '/?keepAlive=true'
];

export class ReplitKeepAliveService {
  private pingTimerId: number | null = null;
  private lastPingTime: number = 0;
  private wakelock: any = null;
  private static instance: ReplitKeepAliveService;

  private constructor() {
    this.lastPingTime = Date.now();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ReplitKeepAliveService {
    if (!ReplitKeepAliveService.instance) {
      ReplitKeepAliveService.instance = new ReplitKeepAliveService();
    }
    return ReplitKeepAliveService.instance;
  }

  /**
   * Initialize and start the keep-alive service
   */
  public start(): void {
    console.log('[ReplitKeepAlive] Service started');
    
    // Start regular pings
    this.startPinging();
    
    // Add visibility change listener
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Try to keep device awake (if supported)
    this.requestWakeLock();
  }

  /**
   * Stop the keep-alive service
   */
  public stop(): void {
    if (this.pingTimerId !== null) {
      window.clearInterval(this.pingTimerId);
      this.pingTimerId = null;
    }
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Release wake lock if we have one
    if (this.wakelock) {
      try {
        this.wakelock.release();
        this.wakelock = null;
      } catch (err) {
        console.warn('[ReplitKeepAlive] Error releasing wake lock:', err);
      }
    }
    
    console.log('[ReplitKeepAlive] Service stopped');
  }

  /**
   * Start the ping interval
   */
  private startPinging(): void {
    // Clear existing timer if any
    if (this.pingTimerId !== null) {
      window.clearInterval(this.pingTimerId);
    }
    
    // Set new ping interval
    this.pingTimerId = window.setInterval(() => {
      console.log(`[ReplitKeepAlive] Sending ping at ${new Date().toLocaleTimeString()}`);
      this.ping();
    }, PING_INTERVAL);
    
    // Do initial ping
    this.ping();
  }

  /**
   * Send ping to keep server active
   */
  private ping(): void {
    this.lastPingTime = Date.now();
    
    // Try all ping URLs in sequence
    PING_URLS.forEach(url => {
      fetch(url, { 
        method: 'GET',
        cache: 'no-store',
        headers: { 'X-Keep-Alive': 'true' }
      })
      .then(() => {
        console.log('[ReplitKeepAlive] Ping successful');
      })
      .catch(err => {
        // Silently fail, we'll try again later
      });
    });
    
    // Also create a hidden image as a backup way to ping the server
    const pingImg = document.createElement('img');
    pingImg.style.position = 'absolute';
    pingImg.style.width = '1px';
    pingImg.style.height = '1px';
    pingImg.style.opacity = '0.01';
    pingImg.src = `/?keepAlive=true&t=${Date.now()}`;
    
    if (document.body) {
      document.body.appendChild(pingImg);
      
      // Remove the image after a moment
      setTimeout(() => {
        if (pingImg.parentNode) {
          pingImg.parentNode.removeChild(pingImg);
        }
      }, 5000);
    }
  }

  /**
   * Handle visibility change event
   */
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      // If it's been more than a minute since the last ping
      if (Date.now() - this.lastPingTime > 60000) {
        console.log('[ReplitKeepAlive] Tab became visible, sending ping');
        this.ping();
      }
      
      // Re-request wake lock when tab becomes visible
      this.requestWakeLock();
    }
  }

  /**
   * Request wake lock to prevent device from sleeping
   */
  private async requestWakeLock(): Promise<void> {
    // Check if the Wake Lock API is supported
    if ('wakeLock' in navigator) {
      try {
        // Release any existing wake lock
        if (this.wakelock) {
          await this.wakelock.release();
          this.wakelock = null;
        }
        
        // Request a screen wake lock
        this.wakelock = await (navigator as any).wakeLock.request('screen');
        
        // Add a listener to re-request the wake lock if it's released
        this.wakelock.addEventListener('release', () => {
          this.wakelock = null;
          // Try to get it again after a moment
          setTimeout(() => this.requestWakeLock(), 1000);
        });
      } catch (err) {
        console.warn('[ReplitKeepAlive] Unable to keep device awake:', err);
      }
    }
  }
}

// Create and export the singleton instance
export const keepAliveService = ReplitKeepAliveService.getInstance();

// Auto-initialize on module import if running in browser
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    keepAliveService.start();
  });
}

export default keepAliveService;