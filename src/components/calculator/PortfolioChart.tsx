import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine 
} from 'recharts';
import { ChartDataPoint } from '@/types/calculator';
import { useIsMobile } from '@/hooks/use-mobile';

interface PortfolioChartProps {
  data: ChartDataPoint[];
  retirementAge: number;
  ssClaimAge?: number;
  monteCarloEnabled?: boolean;
  successProbability?: number;
  dieWithZeroTargetAge?: number;
  planEndAge: number;
  requiredEndingBalance: number;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

interface TooltipPayloadItem {
  dataKey?: string;
  value?: number;
  payload?: ChartDataPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  monteCarloEnabled?: boolean;
}

const CustomTooltip = ({ active, payload, label, monteCarloEnabled }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const mainValue = payload.find(p => p.dataKey === 'balance' || p.dataKey === 'p50');
    
    return (
      <div className="glass-card p-3 border border-primary/30">
        <p className="text-sm font-semibold">Age {label}</p>
        <p className="text-lg font-bold gradient-text">
          {formatCurrency(mainValue?.value || 0)}
        </p>
        {monteCarloEnabled && payload[0]?.payload?.p10 !== undefined && (
          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
           <p>Strong markets (high): {formatCurrency(payload[0].payload.p90)}</p>
      <p>Common high: {formatCurrency(payload[0].payload.p75)}</p>
      <p>Common low: {formatCurrency(payload[0].payload.p25)}</p>
      <p>Weak markets (low): {formatCurrency(payload[0].payload.p10)}</p>
      <p className="mt-1 italic">Stress test, not a forecast.</p>

          </div>
        )}
      </div>
    );
  }
  return null;
};

export function PortfolioChart({ 
  data, 
  retirementAge, 
  ssClaimAge, 
  monteCarloEnabled,
  successProbability,
  dieWithZeroTargetAge,
  planEndAge,
  requiredEndingBalance,
}: PortfolioChartProps) {
  const isMobile = useIsMobile();
  const depletionAge = dieWithZeroTargetAge
    ? data.find(point => point.age >= retirementAge && point.balance < 1)?.age
    : undefined;
  const depletesEarly = depletionAge !== undefined && depletionAge < dieWithZeroTargetAge;

  return (
    <div className="glass-card p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold">Portfolio Projection</h3>
          {depletesEarly && (
            <p className="mt-1 text-sm font-medium text-destructive">
              {monteCarloEnabled ? 'The median simulated path' : 'At your requested spending, the portfolio'} reaches $0 around age {depletionAge},
              before the age-{dieWithZeroTargetAge} target.
            </p>
          )}
        </div>
        {monteCarloEnabled && successProbability !== undefined && (
  <div
    className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30"
    title={`All chart bands and this count use the same 1,000 simulated paths. A successful path stays funded through age ${planEndAge}${requiredEndingBalance > 0 ? ` and finishes with at least ${formatCurrency(requiredEndingBalance)}` : ''}.`}
  >
    <span className="text-xs text-muted-foreground">Successful paths:</span>
    <span
      className={`text-sm font-bold ${
        successProbability >= 0.85 ? "text-emerald-400" :
        successProbability >= 0.7 ? "text-amber-400" : "text-red-400"
      }`}
    >
      {Math.round(successProbability * 1000).toLocaleString()} / 1,000
    </span>
  </div>
)}

         
      </div>
      
      {monteCarloEnabled && (
        <div className="flex flex-wrap gap-4 mb-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary/60" />
            <span className="text-muted-foreground">Median of 1,000 simulated paths</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary/30" />
            <span className="text-muted-foreground">Common range of outcomes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary/15" />
            <span className="text-muted-foreground">Stress test range (good & bad markets)</span>
          </div>
        </div>
      )}
      
      <div className="h-64 sm:h-80 lg:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ 
              top: 10, 
              right: isMobile ? 10 : 30, 
              left: isMobile ? -10 : 0, 
              bottom: 0 
            }}
          >
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="colorP10P90" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0.02}/>
              </linearGradient>
              <linearGradient id="colorP25P75" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(260, 30%, 25%)" 
              vertical={false}
            />
            <XAxis 
              dataKey="age" 
              stroke="hsl(260, 15%, 65%)"
              tick={{ fontSize: isMobile ? 10 : 12 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(260, 30%, 25%)' }}
            />
            <YAxis 
              tickFormatter={formatCurrency}
              stroke="hsl(260, 15%, 65%)"
              tick={{ fontSize: isMobile ? 10 : 12 }}
              tickLine={false}
              axisLine={false}
              width={isMobile ? 50 : 70}
            />
            <Tooltip content={<CustomTooltip monteCarloEnabled={monteCarloEnabled} />} />
            
            {/* Retirement age marker */}
            <ReferenceLine 
              x={retirementAge} 
              stroke="hsl(270, 70%, 60%)" 
              strokeDasharray="5 5"
              label={{ 
                value: 'Retire', 
                position: 'top',
                fill: 'hsl(270, 70%, 60%)',
                fontSize: isMobile ? 10 : 12
              }}
            />

            {depletesEarly && (
              <ReferenceLine
                x={depletionAge}
                stroke="hsl(0, 75%, 58%)"
                strokeDasharray="5 5"
                label={{
                  value: 'Runs out',
                  position: 'top',
                  fill: 'hsl(0, 75%, 58%)',
                  fontSize: isMobile ? 10 : 12
                }}
              />
            )}
            
            {/* SS claim age marker */}
            {ssClaimAge && ssClaimAge !== retirementAge && (
              <ReferenceLine 
                x={ssClaimAge} 
                stroke="hsl(150, 60%, 45%)" 
                strokeDasharray="5 5"
                label={{ 
                  value: 'SS', 
                  position: 'top',
                  fill: 'hsl(150, 60%, 45%)',
                  fontSize: isMobile ? 10 : 12
                }}
              />
            )}
            
            {/* Monte Carlo bands */}
            {monteCarloEnabled && data[0]?.p10 !== undefined && (
              <>
                <Area
                  type="monotone"
                  dataKey="p90"
                  stroke="none"
                  fillOpacity={1}
                  fill="url(#colorP10P90)"
                />
                <Area
                  type="monotone"
                  dataKey="p10"
                  stroke="none"
                  fillOpacity={1}
                  fill="hsl(260, 20%, 15%)"
                />
                <Area
                  type="monotone"
                  dataKey="p75"
                  stroke="none"
                  fillOpacity={1}
                  fill="url(#colorP25P75)"
                />
                <Area
                  type="monotone"
                  dataKey="p25"
                  stroke="none"
                  fillOpacity={1}
                  fill="hsl(260, 20%, 15%)"
                />
              </>
            )}
            
            <Area
              type="monotone"
              dataKey={monteCarloEnabled ? "p50" : "balance"}
              stroke="hsl(270, 70%, 60%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorBalance)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
