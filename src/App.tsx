import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ExportSuccess from "./pages/ExportSuccess";
import Guardrails from "./pages/Guardrails";
import GuardrailsVolatilityPage from "./pages/GuardrailsVolatilityPage";
import GuardrailsMethodsPage from "./pages/GuardrailsMethodsPage";
import MilitaryPension from "./pages/MilitaryPension";
import RothConversion from "./pages/RothConversion";
import SavingsCalculatorPage from "./pages/SavingsCalculatorPage";
import SailAwayPage from "./pages/SailAwayPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/export-success" element={<ExportSuccess />} />
          <Route path="/guardrails" element={<Guardrails />} />
          <Route path="/guardrails/volatility" element={<GuardrailsVolatilityPage />} />
          <Route path="/guardrails/methods" element={<GuardrailsMethodsPage />} />
          <Route path="/military-pension" element={<MilitaryPension />} />
          <Route path="/roth-conversion" element={<RothConversion />} />
          <Route path="/savings-calculator" element={<SavingsCalculatorPage />} />
          <Route path="/sailaway" element={<SailAwayPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
