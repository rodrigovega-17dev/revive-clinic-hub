/**
 * Performance monitoring utilities for subscription flows
 * Tracks loading times, query performance, and provides alerts for slow operations
 */

export interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
  threshold?: number;
  isSlowOperation?: boolean;
}

export interface PerformanceAlert {
  operation: string;
  duration: number;
  threshold: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private alerts: PerformanceAlert[] = [];
  private thresholds: Map<string, number> = new Map();
  private listeners: ((alert: PerformanceAlert) => void)[] = [];

  constructor() {
    // Set default thresholds for subscription operations (in milliseconds)
    this.setThreshold('subscription-plans-load', 2000);
    this.setThreshold('subscription-status-load', 1500);
    this.setThreshold('clinic-subscription-load', 1500);
    this.setThreshold('subscription-create', 5000);
    this.setThreshold('subscription-update', 3000);
    this.setThreshold('subscription-cancel', 3000);
    this.setThreshold('checkout-session-create', 4000);
  }

  /**
   * Set performance threshold for an operation
   */
  setThreshold(operation: string, thresholdMs: number): void {
    this.thresholds.set(operation, thresholdMs);
  }

  /**
   * Start tracking a performance metric
   */
  startTracking(operation: string, metadata?: Record<string, any>): string {
    const trackingId = `${operation}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    const metric: PerformanceMetric = {
      operation,
      startTime: performance.now(),
      metadata,
      threshold: this.thresholds.get(operation),
    };

    this.metrics.set(trackingId, metric);
    
    // Log start of operation in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 Performance tracking started: ${operation}`, metadata);
    }

    return trackingId;
  }

  /**
   * End tracking and calculate performance metrics
   */
  endTracking(trackingId: string, metadata?: Record<string, any>): PerformanceMetric | null {
    const metric = this.metrics.get(trackingId);
    if (!metric) {
      console.warn(`Performance tracking ID not found: ${trackingId}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    const threshold = metric.threshold || 2000;
    const isSlowOperation = duration > threshold;

    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration,
      isSlowOperation,
      metadata: { ...metric.metadata, ...metadata },
    };

    // Update the stored metric
    this.metrics.set(trackingId, completedMetric);

    // Log performance in development
    if (process.env.NODE_ENV === 'development') {
      const emoji = isSlowOperation ? '🐌' : '⚡';
      console.log(
        `${emoji} Performance: ${metric.operation} completed in ${duration.toFixed(2)}ms`,
        {
          threshold: `${threshold}ms`,
          isSlowOperation,
          metadata: completedMetric.metadata,
        }
      );
    }

    // Create alert for slow operations
    if (isSlowOperation) {
      const alert: PerformanceAlert = {
        operation: metric.operation,
        duration,
        threshold,
        timestamp: Date.now(),
        metadata: completedMetric.metadata,
      };

      this.alerts.push(alert);
      this.notifyListeners(alert);

      // Log warning for slow operations
      console.warn(
        `⚠️ Slow subscription operation detected: ${metric.operation}`,
        {
          duration: `${duration.toFixed(2)}ms`,
          threshold: `${threshold}ms`,
          metadata: completedMetric.metadata,
        }
      );
    }

    // Clean up old metrics (keep only last 100)
    if (this.metrics.size > 100) {
      const oldestKey = this.metrics.keys().next().value;
      this.metrics.delete(oldestKey);
    }

    return completedMetric;
  }

  /**
   * Get performance metrics for an operation
   */
  getMetrics(operation?: string): PerformanceMetric[] {
    const allMetrics = Array.from(this.metrics.values()).filter(m => m.duration !== undefined);
    
    if (operation) {
      return allMetrics.filter(m => m.operation === operation);
    }
    
    return allMetrics;
  }

  /**
   * Get performance alerts
   */
  getAlerts(operation?: string): PerformanceAlert[] {
    if (operation) {
      return this.alerts.filter(a => a.operation === operation);
    }
    return [...this.alerts];
  }

  /**
   * Get performance statistics for an operation
   */
  getStats(operation: string): {
    count: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    slowOperationsCount: number;
    slowOperationsPercentage: number;
  } | null {
    const metrics = this.getMetrics(operation);
    
    if (metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration!);
    const slowOperations = metrics.filter(m => m.isSlowOperation);

    return {
      count: metrics.length,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      slowOperationsCount: slowOperations.length,
      slowOperationsPercentage: (slowOperations.length / metrics.length) * 100,
    };
  }

  /**
   * Add listener for performance alerts
   */
  addAlertListener(listener: (alert: PerformanceAlert) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove alert listener
   */
  removeAlertListener(listener: (alert: PerformanceAlert) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Clear all metrics and alerts
   */
  clear(): void {
    this.metrics.clear();
    this.alerts.length = 0;
  }

  /**
   * Export performance data for analysis
   */
  exportData(): {
    metrics: PerformanceMetric[];
    alerts: PerformanceAlert[];
    stats: Record<string, any>;
  } {
    const operations = [...new Set(Array.from(this.metrics.values()).map(m => m.operation))];
    const stats: Record<string, any> = {};
    
    operations.forEach(operation => {
      stats[operation] = this.getStats(operation);
    });

    return {
      metrics: this.getMetrics(),
      alerts: this.getAlerts(),
      stats,
    };
  }

  private notifyListeners(alert: PerformanceAlert): void {
    this.listeners.forEach(listener => {
      try {
        listener(alert);
      } catch (error) {
        console.error('Error in performance alert listener:', error);
      }
    });
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for using performance monitoring
export const usePerformanceMonitor = () => {
  return {
    startTracking: performanceMonitor.startTracking.bind(performanceMonitor),
    endTracking: performanceMonitor.endTracking.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getAlerts: performanceMonitor.getAlerts.bind(performanceMonitor),
    getStats: performanceMonitor.getStats.bind(performanceMonitor),
    addAlertListener: performanceMonitor.addAlertListener.bind(performanceMonitor),
    removeAlertListener: performanceMonitor.removeAlertListener.bind(performanceMonitor),
    exportData: performanceMonitor.exportData.bind(performanceMonitor),
  };
};

// Utility function to wrap async operations with performance tracking
export const withPerformanceTracking = async <T>(
  operation: string,
  asyncFn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> => {
  const trackingId = performanceMonitor.startTracking(operation, metadata);
  
  try {
    const result = await asyncFn();
    performanceMonitor.endTracking(trackingId, { success: true });
    return result;
  } catch (error) {
    performanceMonitor.endTracking(trackingId, { 
      success: false, 
      error: error instanceof Error ? error.message : 'unknown error' 
    });
    throw error;
  }
};