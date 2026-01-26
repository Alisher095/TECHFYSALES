import React, { Suspense } from 'react';
import { useApi } from '@/lib/apiprovider';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
const AlertCard = React.lazy(() => import('@/components/dashboard/AlertCard').then((mod) => ({ default: mod.AlertCard })));
const TrendingTable = React.lazy(() => import('@/components/dashboard/TrendingTable').then((mod) => ({ default: mod.TrendingTable })));
const DemandChart = React.lazy(() => import('@/components/dashboard/DemandChart').then((mod) => ({ default: mod.DemandChart })));
import ErrorBoundary from '@/components/ui/error-boundary';
import { useMemo } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Shield,
  Package,
  BarChart3
} from 'lucide-react';

const Overview = () => {
  const api = useApi();
  const skuMappingsQuery = useQuery({
    queryKey: ['skuMappings'],
    queryFn: () => api.fetchJson('/api/sku-mappings'),
    staleTime: 60_000,
    retry: 1,
  });

  const socialQuery = useQuery({
    queryKey: ['social'],
    queryFn: () => api.fetchJson('/api/social'),
    staleTime: 60_000,
    retry: 1,
  });

  const skuData = Array.isArray(skuMappingsQuery.data) ? skuMappingsQuery.data : [];

  // Derived KPI values (fallback to mocks)
  const kpis = useMemo(() => {
    const skus = Array.isArray(skuMappingsQuery.data) ? skuMappingsQuery.data : null;
    const social = socialQuery.data && socialQuery.data.rows ? socialQuery.data.rows : null;

    const skusMonitored = skus ? skus.length : 0;

    const activeAlerts = social ? social.filter((r: any) => Number(r.mentions) >= 50).length : 0;

    // Simple heuristic revenue projection derived from sku mapping scores
    const revenueProtected = skus ? Math.round(skus.reduce((s: number, it: any) => s + ((it.score || 0) * 100000), 0)) : 0;
    const revenueAtRisk = skus ? Math.round(skus.reduce((s: number, it: any) => s + ((1 - (it.score || 0)) * 50000), 0)) : 0;

    return {
      skusMonitored,
      activeAlerts,
      revenueProtected,
      revenueAtRisk,
    };
  }, [skuMappingsQuery.data, socialQuery.data]);

  // Build alerts from social rows
  const derivedAlerts = useMemo(() => {
    const rows = socialQuery.data && socialQuery.data.rows ? socialQuery.data.rows : null;
    if (!rows) return [];

    // take recent posts, map to AIAlert-like shape
    return rows
      .slice()
      .sort((a: any, b: any) => (Number(b.mentions) || 0) - (Number(a.mentions) || 0))
      .slice(0, 8)
      .map((r: any, idx: number) => {
        const mentions = Number(r.mentions) || 0;
        const status = mentions >= 100 ? 'action_required' : mentions >= 50 ? 'in_review' : 'approved';
        const impact: any = mentions >= 100 ? 'high' : mentions >= 50 ? 'medium' : 'low';
        return {
          id: r.post_id || `s-${idx}`,
          message: r.text || `${r.hashtag || 'signal'} on ${r.source}`,
          status,
          timestamp: r.date ? new Date(r.date).toLocaleString() : 'recent',
          impactLevel: impact,
        };
      });
  }, [socialQuery.data]);

  // Enrich SKU mappings with social-derived metrics for TrendingTable
  const trendingRows = useMemo(() => {
    const skus = Array.isArray(skuMappingsQuery.data) ? skuMappingsQuery.data : null;
    const rows = socialQuery.data && socialQuery.data.rows ? socialQuery.data.rows : null;
    if (!skus) return [];

    // compute mentions per sku
    const mentionsBySku: Record<string, number> = {};
    if (rows) {
      for (const r of rows) {
        const key = r.sku || r.hashtag || 'unknown';
        mentionsBySku[key] = (mentionsBySku[key] || 0) + (Number(r.mentions) || 0);
      }
    }

    return skus.map((s: any, idx: number) => {
      const mentions = mentionsBySku[s.sku] || 0;
      const baseline = 50; // used to scale spike
      const trendSpike = Math.min(999, Math.round((mentions / Math.max(1, baseline)) * 100));
      const timeUntilStockout = (s.score || 0) < 0.85 ? '18 hours' : '3 days';
      const revenueAtRisk = Math.round((1 - (s.score || 0)) * 120000);
      const confidence = Math.round((s.score || 0) * 100);
      return {
        id: s.sku || `sku-${idx}`,
        name: s.title || s.sku,
        sku: s.sku || s.title,
        trendSpike,
        timeUntilStockout,
        revenueAtRisk,
        confidence,
      };
    }).sort((a: any, b: any) => b.trendSpike - a.trendSpike).slice(0, 10);
  }, [skuMappingsQuery.data, socialQuery.data]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="animate-fade-up">
          <h2 className="text-2xl font-bold text-foreground">Executive Overview</h2>
          <p className="text-muted-foreground mt-1">Real-time demand insights and AI-powered recommendations</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <StatCard
            title="Revenue Protected"
            value={`$${(kpis.revenueProtected / 1000).toFixed(0)}K`}
            subtitle={`Next 14 days`}
            icon={Shield}
            variant="success"
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatCard
            title="Revenue at Risk"
            value={`$${(kpis.revenueAtRisk / 1000).toFixed(0)}K`}
            subtitle="Requires immediate action"
            icon={AlertTriangle}
            variant="danger"
          />
          <StatCard
            title="Active AI Alerts"
            value={kpis.activeAlerts}
            subtitle={`${(socialQuery.data && socialQuery.data.rows) ? socialQuery.data.rows.length : 0} total signals`}
            icon={TrendingUp}
            variant="warning"
          />
          <StatCard
            title="SKUs Monitored"
            value={new Intl.NumberFormat().format(kpis.skusMonitored)}
            subtitle="From SKU mappings"
            icon={Package}
            variant="primary"
            trend={{ value: 8.2, isPositive: true }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Trending SKUs - Takes 2 columns */}
            <div className="xl:col-span-2 bg-card rounded-xl border p-5 animate-fade-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Trending SKUs at Risk
                  </h3>
                  <p className="text-sm text-muted-foreground">Top 5 products requiring attention</p>
                </div>
                <span className="status-badge status-action-required">
                  <AlertTriangle className="w-3 h-3" />
                  {(trendingRows && trendingRows.filter((s: any) => s.timeUntilStockout.includes('hour')).length) || 0} Critical
                </span>
              </div>
              <ErrorBoundary>
                  <Suspense fallback={<div className="p-4">Loading trending table...</div>}>
                  <TrendingTable data={trendingRows.length ? trendingRows : skuData} />
                </Suspense>
              </ErrorBoundary>
            </div>

          {/* AI Alerts */}
          <div className="bg-card rounded-xl border p-5 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Today's AI Alerts</h3>
              <span className="text-xs font-medium text-primary cursor-pointer hover:underline">View All</span>
            </div>
            <div className="space-y-3">
              <ErrorBoundary>
                <Suspense fallback={<div className="p-2">Loading alerts...</div>}>
                  {derivedAlerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {/* Forecast Chart */}
        <div className="animate-fade-up" style={{ animationDelay: '0.4s' }}>
          <ErrorBoundary>
            <Suspense fallback={<div className="p-4">Loading forecast chart...</div>}>
              <DemandChart />
            </Suspense>
          </ErrorBoundary>
        </div>

        {/* Revenue Impact Card */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 p-6 animate-fade-up" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
              <DollarSign className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Projected Revenue Impact</h3>
              <p className="text-muted-foreground">Next 14 days projection based on AI analysis</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-3xl font-bold text-success">${(kpis.revenueProtected / 1000).toFixed(0)}K</p>
              <p className="text-sm text-muted-foreground">revenue protected through early detection</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Overview;
