import { GuidanceItem } from '@/types/calculator';
import { cn } from '@/lib/utils';
import { 
  PiggyBank, 
  Clock, 
  TrendingUp, 
  Receipt, 
  PartyPopper 
} from 'lucide-react';

interface GuidancePanelProps {
  items: GuidanceItem[];
  isOnTrack: boolean;
}

const iconMap = {
  savings: PiggyBank,
  'retire-later': Clock,
  return: TrendingUp,
  expenses: Receipt,
  success: PartyPopper
};

export function GuidancePanel({ items, isOnTrack }: GuidancePanelProps) {
  return (
    <div className={cn(
      'glass-card p-4 sm:p-6',
      isOnTrack ? 'border-success/30' : 'border-warning/30'
    )}>
      <h3 className="text-lg font-semibold mb-4">
        {isOnTrack ? 'Great News!' : 'To Reach Your Goal...'}
      </h3>
      
      <div className="space-y-3">
        {items.map((item, index) => {
          const Icon = iconMap[item.type];
          
          return (
            <div
              key={index}
              className={cn(
                'flex items-start gap-4 p-4 rounded-xl transition-all duration-200',
                item.type === 'success' 
                  ? 'bg-success/10 border border-success/20' 
                  : 'bg-secondary/30 hover:bg-secondary/50'
              )}
            >
              <div className={cn(
                'p-2 rounded-lg',
                item.type === 'success' ? 'bg-success/20' : 'bg-primary/20'
              )}>
                <Icon className={cn(
                  'w-5 h-5',
                  item.type === 'success' ? 'text-success' : 'text-primary'
                )} />
              </div>
              
              <div className="flex-1">
                <div className="font-semibold">{item.title}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.description}
                </p>
              </div>
              
              {item.value && (
                <div className="text-right">
                  <div className="font-bold text-primary">{item.value}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
