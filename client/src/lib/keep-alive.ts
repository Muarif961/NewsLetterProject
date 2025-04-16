/**
 * Keep-Alive Service - DEPRECATED
 * 
 * This service has been replaced by the more robust ReplitKeepAliveService.
 * This file is maintained for backward compatibility but doesn't actually
 * do anything anymore.
 */

// Import the real service to maintain compatibility with existing imports
import { keepAliveService as realKeepAliveService } from './replit-keep-alive';

class KeepAliveService {
  start() {
    console.log('[KeepAlive] Deprecated service - using ReplitKeepAliveService instead');
    // Forward to the real service
    realKeepAliveService.start();
  }

  stop() {
    console.log('[KeepAlive] Deprecated service - using ReplitKeepAliveService instead');
    // Forward to the real service
    realKeepAliveService.stop();
  }
}

// Create a singleton instance that forwards to the real service
const keepAliveService = new KeepAliveService();

export default keepAliveService;