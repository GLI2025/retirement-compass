import {
  Lightbulb,
  Clock,
  PiggyBank,
  TrendingUp,
  Shield
} from 'lucide-react';

type Concept = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  // Optional: you can add this later if you want the cards clickable
  link?: string;
};

const concepts: Concept[] = [
  {
    title: "Time Horizon",
    description:
      'How long until you retire (and how long retirement lasts). Change "When do you want to retire?" above to see how extra years amplify compounding and shorten the drawdown period.',
    icon: Clock
  },
  {
    title: "Contributions",
    description:
      'What you add each month (plus employer match). Try raising "How much are you saving per month now?" or enable annual contribution increases.',
    icon: PiggyBank
  },
  {
    title: "Investments & Returns",
    description:
      "Expected long-run growth rate. Switch the investment strategy to see how an ongoing return affects the savings required and the retirement drawdown.",
    icon: TrendingUp
  },
  {
    title: "Expenses",
    description:
      'What you’ll spend in retirement. Adjust "How much do you live on per month now?" (we use 80% by default) and optionally turn on inflation to model rising costs.',
    icon: Shield
  }
];

export function EducationalBox() {
  return (
    <div className="glass-card p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-warning" />
        <h3 className="text-lg font-semibold">The 4 Big Concepts of Retirement Planning</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {concepts.map((concept, index) => {
          const Icon = concept.icon;

          const CardInner = (
            <>
              <div className="p-2 rounded-lg bg-primary/20 h-fit">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm group-hover:text-primary transition-colors">
                  {concept.title}
                  <span className="ml-1 opacity-50 text-xs">Edit →</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {concept.description}
                </p>
              </div>
            </>
          );

          // If link is provided, render clickable <a>; otherwise render a <div>
          return concept.link ? (
            <a
              key={index}
              href={concept.link}
              className="group flex gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all duration-200"
            >
              {CardInner}
            </a>
          ) : (
            <div
              key={index}
              className="group flex gap-3 p-3 rounded-xl bg-secondary/30"
            >
              {CardInner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
