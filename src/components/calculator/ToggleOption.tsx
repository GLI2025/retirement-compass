import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface ToggleOptionProps {
  label: string;
  description?: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}

export function ToggleOption({
  label,
  description,
  enabled,
  onToggle,
  children,
  className
}: ToggleOptionProps) {
  const [expanded, setExpanded] = useState(enabled);

  const handleToggle = (checked: boolean) => {
    onToggle(checked);
    if (checked) {
      setExpanded(true);
    }
  };

  return (
    <div className={cn('glass-card p-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              className="data-[state=checked]:bg-primary"
            />
            <div>
              <label className="font-medium cursor-pointer" onClick={() => handleToggle(!enabled)}>
                {label}
              </label>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
          </div>
        </div>
        
        {enabled && children && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      
      {enabled && expanded && children && (
        <div className="mt-4 pt-4 border-t border-border/50 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}
