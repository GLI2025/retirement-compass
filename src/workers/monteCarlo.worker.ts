import type { CalculatorInputs, CalculatorResults } from '@/types/calculator';
import { calculateRetirement } from '@/utils/calculations';

interface MonteCarloWorkerRequest {
  inputs: CalculatorInputs;
  requestId: number;
}

interface MonteCarloWorkerResponse {
  requestId: number;
  results?: CalculatorResults;
  error?: string;
}

self.onmessage = (event: MessageEvent<MonteCarloWorkerRequest>) => {
  const { inputs, requestId } = event.data;

  try {
    const response: MonteCarloWorkerResponse = {
      requestId,
      results: calculateRetirement({ ...inputs, monteCarloEnabled: true }),
    };
    self.postMessage(response);
  } catch (error) {
    const response: MonteCarloWorkerResponse = {
      requestId,
      error: error instanceof Error ? error.message : 'Monte Carlo simulation failed.',
    };
    self.postMessage(response);
  }
};
