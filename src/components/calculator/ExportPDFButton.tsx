import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CalculatorResults, CalculatorInputs } from '@/types/calculator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExportPDFButtonProps {
  results: CalculatorResults;
  inputs: CalculatorInputs;
  chartRef?: React.RefObject<HTMLDivElement>;
}

export function ExportPDFButton({ results, inputs, chartRef }: ExportPDFButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsLoading(true);

    try {
      // Capture chart as image if available
      let chartImage: string | undefined;
      if (chartRef?.current) {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: '#1a1a2e',
          scale: 2,
        });
        chartImage = canvas.toDataURL('image/png');
      }

      // Prepare data for checkout
      const calculatorData = {
        results: {
          requiredSavings: results.requiredSavings,
          projectedAtRetirement: results.projectedAtRetirement,
          gap: results.gap,
          isOnTrack: results.isOnTrack,
          checkpoints: results.checkpoints,
        },
        inputs: {
          currentAge: inputs.currentAge,
          retirementAge: inputs.retirementAge,
          monthlyExpenses: inputs.monthlyExpenses,
          currentSavings: inputs.currentSavings,
          monthlyContribution: inputs.monthlyContribution,
          employerContribution: inputs.employerContribution,
          investmentStrategy: inputs.investmentStrategy,
        },
        chartImage,
      };

      // Store in sessionStorage for retrieval after payment
      sessionStorage.setItem('pendingPDFExport', JSON.stringify(calculatorData));

      // Create checkout session
      const { data, error } = await supabase.functions.invoke('create-pdf-checkout', {
        body: { calculatorData },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Unable to start checkout. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isLoading}
      className="gap-2"
      variant="outline"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      Export PDF - $3
    </Button>
  );
}
