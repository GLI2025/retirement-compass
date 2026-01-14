import { Sparkles } from "lucide-react";

export function CalculatorHeader() {
  return (
    <header className="py-8 sm:py-12 px-4">
      <div className="container max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">
            A Starting Place for Retirement Planning
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
          <span className="gradient-text">Retirement Savings</span>
          <br />
          <span className="text-foreground">Calculator</span>
        </h1>

        <p className="text-muted-foreground max-w-2xl mx-auto">
          Estimate your financial future potential. Adjust your inputs and see
          real-time projections of your retirement portfolio.
        </p>
      </div>
    </header>
  );
}
