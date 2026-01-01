import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Download, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { generateRetirementPDF, PDFExportData } from '@/utils/pdfGenerator';

type ExportStatus = 'verifying' | 'generating' | 'ready' | 'error' | 'downloading';

export default function ExportSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ExportStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setErrorMessage('No session ID provided');
      return;
    }

    verifyAndGeneratePDF();
  }, [sessionId]);

  const verifyAndGeneratePDF = async () => {
    try {
      // Verify payment
      const { data, error } = await supabase.functions.invoke('verify-pdf-payment', {
        body: { sessionId },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Payment verification failed');
      }

      setStatus('generating');

      // Get calculator data - first try from response, then from sessionStorage
      let calculatorData: PDFExportData = data.calculatorData;
      
      if (!calculatorData) {
        const stored = sessionStorage.getItem('pendingPDFExport');
        if (stored) {
          calculatorData = JSON.parse(stored);
          sessionStorage.removeItem('pendingPDFExport');
        }
      }

      if (!calculatorData) {
        throw new Error('Calculator data not found. Please try exporting again.');
      }

      // Generate PDF
      const blob = await generateRetirementPDF(calculatorData);
      setPdfBlob(blob);
      setStatus('ready');

      // Auto-download
      downloadPDF(blob);
    } catch (error) {
      console.error('Error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  const downloadPDF = (blob: Blob = pdfBlob!) => {
    if (!blob) return;
    
    setStatus('downloading');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retirement-plan-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus('ready');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md w-full text-center space-y-6">
        {status === 'verifying' && (
          <>
            <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
            <h1 className="text-2xl font-bold">Verifying Payment...</h1>
            <p className="text-muted-foreground">
              Please wait while we confirm your purchase.
            </p>
          </>
        )}

        {status === 'generating' && (
          <>
            <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
            <h1 className="text-2xl font-bold">Generating Your PDF...</h1>
            <p className="text-muted-foreground">
              Creating your personalized retirement plan document.
            </p>
          </>
        )}

        {(status === 'ready' || status === 'downloading') && (
          <>
            <CheckCircle className="w-16 h-16 text-success mx-auto" />
            <h1 className="text-2xl font-bold">Your PDF is Ready!</h1>
            <p className="text-muted-foreground">
              Your retirement plan has been generated successfully.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => downloadPDF()}
                className="w-full gap-2"
                disabled={status === 'downloading'}
              >
                {status === 'downloading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Calculator
              </Button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold">Something Went Wrong</h1>
            <p className="text-muted-foreground">{errorMessage}</p>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Calculator
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
