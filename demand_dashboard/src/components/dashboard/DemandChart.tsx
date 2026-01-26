import { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { generateForecastData } from '@/lib/mockData';
import { useApi } from '@/lib/apiprovider';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DemandChartProps {
  className?: string;
}

const timeRanges = [
  { label: '7D', days: 7 },
  { label: '14D', days: 14 },
  { label: '30D', days: 30 },
];

export function DemandChart({ className }: DemandChartProps) {
  const [selectedRange, setSelectedRange] = useState(14);
  const api = useApi();

  // fetch historic series for a default SKU and forecast
  const sku = 'GS-019';

  const historicQuery = useQuery({
    queryKey: ['historic', sku],
    queryFn: () => api.fetchJson(`/api/historic?sku=${sku}`),
    staleTime: 60_000,
    retry: 1,
  });

  const forecastQuery = useQuery({
    queryKey: ['forecast', sku, selectedRange],
    queryFn: () => api.fetchJson(`/api/forecast?sku=${sku}&horizon=${selectedRange}`),
    staleTime: 60_000,
    retry: 1,
    enabled: !!historicQuery.data || true,
  });

  // combine into chart data, fallback to mock
  let data = generateForecastData(selectedRange);
  try {
    if (historicQuery.data && Array.isArray(historicQuery.data.dates)) {
      const histDates: string[] = historicQuery.data.dates || [];
      const histValues: number[] = historicQuery.data.values || [];
      const combined: any[] = [];
      for (let i = 0; i < histDates.length; i++) {
        combined.push({ date: histDates[i], historical: histValues[i] });
      }
      if (forecastQuery.data && Array.isArray(forecastQuery.data.forecast_dates || forecastQuery.data.forecastDates)) {
        const fcDates = forecastQuery.data.forecast_dates || forecastQuery.data.forecastDates || [];
        const fcVals = forecastQuery.data.forecast || [];
        for (let i = 0; i < fcDates.length; i++) {
          combined.push({ date: fcDates[i], forecast: fcVals[i] });
        }
      }
      if (combined.length) data = combined;
    }
  } catch (e) {
    // keep mock data
  }

  return (
    <div className={cn("bg-card rounded-xl border p-5", className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Demand Forecast</h3>
          <p className="text-sm text-muted-foreground">Historical vs AI Predictions</p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {timeRanges.map((range) => (
            <Button
              key={range.days}
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRange(range.days)}
              className={cn(
                "h-7 px-3 text-xs font-medium",
                selectedRange === range.days 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="historical"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              fill="url(#historicalGradient)"
              name="Historical"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="forecast"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="url(#forecastGradient)"
              name="AI Forecast"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="forecastHigh"
              stroke="transparent"
              fill="hsl(var(--chart-2))"
              fillOpacity={0.1}
              name="Upper Bound"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="forecastLow"
              stroke="transparent"
              fill="hsl(var(--background))"
              name="Lower Bound"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
