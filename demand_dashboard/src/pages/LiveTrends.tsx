import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/apiprovider";
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
// Temporary mock fallback until backend is stable
const mockSignals = [
  { id: 1, sku: "GS-019", source: "TikTok", velocity: 42, keyword: "#kettle", timestamp: "2026-01-08T12:00:00Z" },
  { id: 2, sku: "GS-045", source: "Instagram", velocity: 18, keyword: "#mug", timestamp: "2026-01-08T12:01:00Z" },
];

const mockGoogleSignals = [
  { id: 101, sku: "GS-019", source: "Google", velocity: 85, keyword: "#kettle", timestamp: "2026-01-10T00:00:00Z" },
  { id: 102, sku: "GS-019", source: "Google", velocity: 90, keyword: "#kettle", timestamp: "2026-01-11T00:00:00Z" },
  { id: 103, sku: "GS-019", source: "Google", velocity: 70, keyword: "#kettle", timestamp: "2026-01-12T00:00:00Z" },
  { id: 104, sku: "GS-019", source: "Google", velocity: 95, keyword: "#kettle", timestamp: "2026-01-13T00:00:00Z" },
  { id: 105, sku: "GS-019", source: "Google", velocity: 110, keyword: "#kettle", timestamp: "2026-01-14T00:00:00Z" },
];

export default function TrendRadar() {
  const { fetchJson, fetchTrends } = useApi();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Query backend signals with polling every 30s
  const signalsQuery = useQuery({
    queryKey: ["trendSignals"],
    queryFn: () => fetchJson("/api/trends/signals"),
    staleTime: 60_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  const socialQuery = useQuery({
    queryKey: ["social"],
    queryFn: () => fetchJson("/api/social"),
    staleTime: 60_000,
    retry: 1,
  });

  const googleSignalsQuery = useQuery({
    queryKey: ["trendSignals", "google"],
    queryFn: () => fetchJson("/api/trends/signals/google"),
    staleTime: 60_000,
    retry: 1,
  });

  const trendsQuery = useQuery({
    queryKey: ["trends"],
    queryFn: fetchTrends,
    staleTime: 60_000,
    retry: 1,
  });

  // Safe fallback
  const signals = Array.isArray(signalsQuery.data) ? signalsQuery.data : mockSignals;
  const googleSignals = useMemo(() => {
    const primary = Array.isArray(googleSignalsQuery.data) ? googleSignalsQuery.data : [];
    if (primary.length > 0) {
      return primary;
    }
    const filtered = signals.filter((signal) => (signal.source || "").toString().toLowerCase() === "google");
    return filtered.length > 0 ? filtered : mockGoogleSignals;
  }, [googleSignalsQuery.data, signals]);

  const sourceChartData = useMemo(() => {
    const buckets: Record<string, number> = {
      google: 0,
      tiktok: 0,
      instagram: 0,
    };
    const inputSignals = signals.length > 0 ? signals : mockSignals;
    inputSignals.forEach((signal) => {
      const source = (signal.source || "").toString().toLowerCase();
      const value = Number(signal.velocity ?? signal.mentions ?? signal.value ?? 0);
      if (source.includes("google")) {
        buckets.google += value;
      } else if (source.includes("tiktok")) {
        buckets.tiktok += value;
      } else if (source.includes("instagram")) {
        buckets.instagram += value;
      }
    });
    // ensure google bucket honors the derived googleSignals (including mock fallback)
    const googleFromSignals = Array.isArray(googleSignals) && googleSignals.length > 0
      ? googleSignals.reduce((sum, signal) => sum + Number(signal.velocity ?? signal.mentions ?? 0), 0)
      : buckets.google;
    buckets.google = googleFromSignals;
    return [
      { source: "Google", velocity: buckets.google },
      { source: "TikTok", velocity: buckets.tiktok },
      { source: "Instagram", velocity: buckets.instagram },
    ];
  }, [signals, googleSignalsQuery.data]);

  const chartData = useMemo(() => {
    const trendSources = trendsQuery.data?.signal_sources ?? [];
    if (trendSources.length > 0) {
      return trendSources.map((source: any) => ({
        source: String(source.name || source.source || '').toString() || 'Unknown',
        velocity: Number(source.mentions ?? 0),
      }));
    }
    return sourceChartData;
  }, [sourceChartData, trendsQuery.data]);

  const totalSourceVelocity = useMemo(
    () => chartData.reduce((sum, entry) => sum + entry.velocity, 0),
    [chartData]
  );

  if (signalsQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">Loading signals…</div>
      </DashboardLayout>
    );
  }

  if (signalsQuery.isError) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="mt-4">
            <SignalPanel
              signals={signals}
              chartData={chartData}
              totalVelocity={totalSourceVelocity}
              trendKeywords={trendsQuery.data?.trend_keywords}
            />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Trend Radar</h2>
            <p className="text-xs text-muted-foreground">
              Trends to follow:&nbsp;
              <a
                href="https://trends.google.com/trending?geo=US&hl=en-US&hours=168&sort=search-volume&category=5"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >Google Trend Radar</a>
            </p>
          </div>
          <div className="text-sm text-muted-foreground">Auto-refresh every 30s · Google signal velocity only</div>
        </div>

          <SignalPanel
            signals={signals}
            social={socialQuery.data}
            chartData={chartData}
            totalVelocity={totalSourceVelocity}
            trendKeywords={trendsQuery.data?.trend_keywords}
            onOpenHashtag={(tag: string) => { setSelectedTag(tag); setDialogOpen(true); }}
          />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogTitle>Posts for {selectedTag}</DialogTitle>
            <DialogDescription>
              <div className="mt-4 space-y-3">
                {(socialQuery.data?.rows || []).filter((r: any) => {
                  const h = (r.hashtag || '').toString().toLowerCase();
                  return h && selectedTag && h.includes(selectedTag.toLowerCase().replace('#',''));
                }).slice(0, 10).map((r: any) => (
                  <div key={r.post_id || r.date + r.hashtag} className="p-3 border rounded-md">
                    <div className="text-sm text-muted-foreground">{r.source} • {r.sku || '—'} • {r.date}</div>
                    <div className="mt-1 text-foreground">{r.text || r.post || ''}</div>
                  </div>
                ))}
              </div>
            </DialogDescription>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// Simple list component
function SignalPanel({
  signals,
  social,
  chartData = [],
  totalVelocity = 0,
  trendKeywords = [],
  onOpenHashtag,
}: {
  signals: any[];
  social?: any;
  chartData?: { date: string; velocity: number }[];
  totalVelocity?: number;
  trendKeywords?: Array<{ keyword: string; mentions: number; change24: number; change7: number }>;
  onOpenHashtag?: (tag: string) => void;
}) {

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-card rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Signal Velocity</h3>
          <p className="text-xs text-muted-foreground">{totalVelocity.toLocaleString()} total mentions · multi-source</p>
        </div>
        <div className="h-64">
          {totalVelocity === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              No signal velocity data available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                <XAxis dataKey="source" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="velocity" name="Velocity" fill="hsl(var(--chart-1))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border p-4">
        <h3 className="text-lg font-semibold mb-3">Top Hashtags</h3>
        <div className="space-y-2 mb-4">
          {(social?.top_hashtags || aggregateTopHashtags(signals)).slice(0, 6).map((t: any) => (
            <button key={t.hashtag || t.name} onClick={() => onOpenHashtag?.(t.hashtag || t.name)} className="flex items-start justify-between w-full text-left">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{t.hashtag || t.name}</p>
                <p className="text-xs text-muted-foreground">{snippetForHashtag(social, signals, t.hashtag || t.name)}</p>
              </div>
              <div className="text-sm font-semibold text-foreground">{t.count ?? t.mentions ?? 0}</div>
            </button>
          ))}
        </div>

        <h3 className="text-lg font-semibold mb-3">Top Keywords</h3>
        <div className="space-y-2 mb-4">
          {(trendKeywords || []).length === 0 ? (
            <div className="text-xs text-muted-foreground">No keyword trends available yet.</div>
          ) : (
            (trendKeywords || []).slice(0, 6).map((item) => (
              <div key={item.keyword} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.keyword}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.change24 >= 0 ? '+' : ''}{item.change24}% 24h · {item.change7 >= 0 ? '+' : ''}{item.change7}% 7d
                  </p>
                </div>
                <div className="text-sm font-semibold text-foreground">{item.mentions}</div>
              </div>
            ))
          )}
        </div>

        <h3 className="text-lg font-semibold mb-3">Recent Signals</h3>
        <div className="space-y-3 max-h-48 overflow-auto">
          {signals.map((s) => (
            <SignalCard key={s.id} s={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

function aggregateTopHashtags(signals: any[]) {
  const map: Record<string, { hashtag: string; count: number }> = {};
  signals.forEach((s) => {
    const h = String(s.keyword || s.hashtag || '').toLowerCase();
    if (!h) return;
    if (!map[h]) map[h] = { hashtag: h, count: 0 };
    map[h].count += Number(s.velocity ?? s.mentions ?? 0);
  });
  return Object.values(map).sort((a, b) => b.count - a.count);
}

function snippetForHashtag(social: any, signals: any[], hashtag: string) {
  if (!hashtag) return '';
  // prefer full social rows with text
  const rows = social?.rows || [];
  const found = rows.find((r: any) => (r.hashtag || r.hashtag?.toString?.() || '').toLowerCase() === hashtag.toLowerCase());
  if (found && found.text) return found.text;
  // fallback: find in signals
  const sfound = signals.find((r: any) => String(r.keyword || r.hashtag || '').toLowerCase() === hashtag.toLowerCase());
  return sfound?.text || sfound?.post || '';
}

function SignalCard({ s }: { s: any }) {
  const keyword = s.keyword || s.hashtag || s.tag || '';
  const source = s.source || s.platform || 'unknown';
  const velocity = Number(s.velocity ?? s.mentions ?? 0);
  let timeLabel = '';
  try {
    timeLabel = s.timestamp ? new Date(s.timestamp).toLocaleString() : '';
  } catch (e) {
    timeLabel = String(s.timestamp || '');
  }

  return (
    <div className="p-3 rounded-lg border bg-card/50 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{keyword || source}</p>
          <p className="text-xs text-muted-foreground">Source: {String(source)}</p>
          <p className="text-xs text-muted-foreground">SKU: {String(s.sku || s.sku_id || '')}</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">{velocity}</div>
          <div className="text-xs text-muted-foreground">{timeLabel}</div>
        </div>
      </div>
    </div>
  );
}
