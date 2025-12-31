import { RotateCcw, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResetButtonsProps {
  onResetSavings: () => void;
  onResetWhatIf: () => void;
  onResetAll: () => void;
}

export function ResetButtons({ onResetSavings, onResetWhatIf, onResetAll }: ResetButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onResetSavings}
        className="glass-input border-border/50 hover:bg-secondary/50"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Reset Savings
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onResetWhatIf}
        className="glass-input border-border/50 hover:bg-secondary/50"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Reset What-If
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onResetAll}
        className="glass-input border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Reset All
      </Button>
    </div>
  );
}
