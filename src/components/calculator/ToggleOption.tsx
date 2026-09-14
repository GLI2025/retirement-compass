import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useId, useState } from 'react';

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
  const generatedId = useId();
  const switchId = `toggle-${generatedId}`;
  const descriptionId = description ? `${switchId}-description` : undefined;
  const contentId = `${switchId}-content`;

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
              id={switchId}
              checked={enabled}
              onCheckedChange={handleToggle}
              aria-label={label}
              aria-describedby={descriptionId}
              className="data-[state=checked]:bg-primary"
            />
            <div>
              <label className="font-medium cursor-pointer" htmlFor={switchId}>
                {label}
              </label>
              {description && (
                <p id={descriptionId} className="text-xs text-muted-foreground mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {enabled && children && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${label} options`}
            aria-expanded={expanded}
            aria-controls={contentId}
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
        <div id={contentId} className="mt-4 pt-4 border-t border-border/50 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}
