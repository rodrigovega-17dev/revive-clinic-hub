import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Clock, 
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react';
import { usePerformanceMonitor } from '@/lib/performance-monitor';
import type { PerformanceMetric, PerformanceAlert } from '@/lib/performance-monitor';

interface PerformanceMonitorDashboardProps {
  className?: string;
}

const PerformanceMonitorDashboard: React.FC<PerformanceMonitorDashboardProps> = ({ 
  className 
}) => {
  const { t } = useTranslation();
  const { 
    getMetrics, 
    getAlerts, 
    getStats, 
    exportData,
    addAlertListener,
    removeAlertListener
  } = usePerformanceMonitor();
  
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh data
  const refreshData = () => {
    setMetrics(getMetrics());
    setAlerts(getAlerts());
    
    // Get stats for all operations
    const operations = [...new Set(getMetrics().map(m => m.operation))];
    const newStats: Record<string, any> = {};
    operations.forEach(operation => {
      newStats[operation] = getStats(operation);
    });
    setStats(newStats);
    setRefreshKey(prev => prev + 1);
  };

  // Listen for new alerts
  useEffect(() => {
    const handleNewAlert = (alert: PerformanceAlert) => {
      setAlerts(prev => [alert, ...prev]);
    };

    addAlertListener(handleNewAlert);
    refreshData();

    return () => {
      removeAlertListener(handleNewAlert);
    };
  }, []);

  // Export performance data
  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getOperationIcon = (operation: string) => {
    if (operation.includes('load')) return <Clock className="h-4 w-4" />;
    if (operation.includes('create')) return <Zap className="h-4 w-4" />;
    if (operation.includes('update')) return <RefreshCw className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getPerformanceColor = (duration: number, threshold: number) => {
    const ratio = duration / threshold;
    if (ratio < 0.5) return 'text-green-600';
    if (ratio < 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Performance Monitor</h2>
          <p className="text-muted-foreground">
            Subscription system performance metrics and alerts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      {alerts.length > 0 && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {alerts.length} performance alert{alerts.length !== 1 ? 's' : ''} detected. 
            Check the Alerts tab for details.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {alerts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(stats).map(([operation, stat]) => {
              if (!stat) return null;
              
              return (
                <Card key={operation}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {getOperationIcon(operation)}
                      {operation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Avg Duration:</span>
                        <span className={getPerformanceColor(stat.averageDuration, 2000)}>
                          {formatDuration(stat.averageDuration)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Operations:</span>
                        <span>{stat.count}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Slow Ops:</span>
                        <span className={stat.slowOperationsCount > 0 ? 'text-red-600' : 'text-green-600'}>
                          {stat.slowOperationsCount} ({stat.slowOperationsPercentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recent Performance Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Recent Performance Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats).map(([operation, stat]) => {
                  if (!stat) return null;
                  
                  const recentMetrics = getMetrics(operation).slice(-10);
                  const trend = recentMetrics.length >= 2 
                    ? recentMetrics[recentMetrics.length - 1].duration! - recentMetrics[0].duration!
                    : 0;
                  
                  return (
                    <div key={operation} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getOperationIcon(operation)}
                        <div>
                          <div className="font-medium">
                            {operation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Last {recentMetrics.length} operations
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={getPerformanceColor(stat.averageDuration, 2000)}>
                          {formatDuration(stat.averageDuration)}
                        </span>
                        {trend !== 0 && (
                          <div className={`flex items-center gap-1 ${trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            <span className="text-xs">
                              {Math.abs(trend).toFixed(0)}ms
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {metrics.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No performance metrics recorded yet.
                  </p>
                ) : (
                  metrics.slice().reverse().map((metric, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getOperationIcon(metric.operation)}
                        <div>
                          <div className="font-medium">
                            {metric.operation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(metric.startTime + performance.timeOrigin).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={
                          metric.duration 
                            ? getPerformanceColor(metric.duration, metric.threshold || 2000)
                            : 'text-muted-foreground'
                        }>
                          {metric.duration ? formatDuration(metric.duration) : 'In Progress'}
                        </span>
                        {metric.isSlowOperation && (
                          <Badge variant="destructive">Slow</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Performance Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {alerts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No performance alerts. Great job! 🎉
                  </p>
                ) : (
                  alerts.map((alert, index) => (
                    <Alert key={index} className="border-red-200">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {alert.operation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                            <div className="text-sm">
                              Took {formatDuration(alert.duration)} (threshold: {formatDuration(alert.threshold)})
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(alert.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <Badge variant="destructive">
                            +{formatDuration(alert.duration - alert.threshold)}
                          </Badge>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceMonitorDashboard;