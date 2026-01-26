import React from "react";
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
import { useState } from 'react';
// Temporary mock fallback until backend is stable
const mockSignals = [
  { id: 1, sku: "GS-019", source: "TikTok", velocity: 42, keyword: "#kettle", timestamp: "2026-01-08T12:00:00Z" },
  { id: 2, sku: "GS-045", source: "Instagram", velocity: 18, keyword: "#mug", timestamp: "2026-01-08T12:01:00Z" },
];

export default function LiveTrends() {
  const { fetchJson } = useApi();
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

  // Safe fallback
  const signals = Array.isArray(signalsQuery.data) ? signalsQuery.data : mockSignals;

  if (signalsQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">Loading signals…</div>
      </DashboardLayout>
    );
  }

  if (signalsQuery.isError) {
    console.error(signalsQuery.error);
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-orange-500">Unable to load live signals — showing fallback data.</div>
          <div className="mt-4">
            <SignalPanel signals={signals} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Live Trends</h2>
          <div className="text-sm text-muted-foreground">Auto-refresh every 30s</div>
        </div>

        <SignalPanel
          signals={signals}
          social={socialQuery.data}
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
function SignalPanel({ signals, social, onOpenHashtag }: { signals: any[]; social?: any; onOpenHashtag?: (tag: string) => void }) {
  // normalize data for chart
  const chartData = signals.map((s) => ({
    name: String(s.keyword || s.hashtag || s.tag || s.source || 'signal'),
    velocity: Number(s.velocity ?? s.mentions ?? s.value ?? 0),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-card rounded-xl border p-4">
        <h3 className="text-lg font-semibold mb-3">Signal Velocity</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="velocity" fill="hsl(var(--chart-1))" />
            </BarChart>
          </ResponsiveContainer>
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
