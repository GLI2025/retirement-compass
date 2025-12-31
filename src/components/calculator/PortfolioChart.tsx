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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border border-primary/30">
        <p className="text-sm font-semibold">Age {label}</p>
        <p className="text-lg font-bold gradient-text">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export function PortfolioChart({ data, retirementAge, ssClaimAge }: PortfolioChartProps) {
  const isMobile = useIsMobile();

  return (
    <div className="glass-card p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-4">Portfolio Projection</h3>
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
            <Tooltip content={<CustomTooltip />} />
            
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
            
            <Area
              type="monotone"
              dataKey="balance"
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
