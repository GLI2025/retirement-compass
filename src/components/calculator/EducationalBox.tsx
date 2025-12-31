import { 
  Lightbulb, 
  TrendingUp, 
  Shield, 
  Clock,
  PiggyBank 
} from 'lucide-react';

const concepts = [
  {
    icon: PiggyBank,
    title: 'Start Early',
    description: 'Compound interest is your best friend. Starting 10 years earlier can double your retirement savings.',
    link: '#currentAge'
  },
  {
    icon: TrendingUp,
    title: 'Invest Wisely',
    description: 'Higher returns come with higher risk. Balance your portfolio based on your timeline.',
    link: '#strategy'
  },
  {
    icon: Shield,
    title: 'Inflation Protection',
    description: 'Your expenses will grow over time. Plan for ~3% annual inflation to maintain purchasing power.',
    link: '#inflation'
  },
  {
    icon: Clock,
    title: 'Social Security Timing',
    description: 'Delaying SS from 62 to 70 can increase benefits by 77%. Consider your health and other income.',
    link: '#whatif'
  }
];

export function EducationalBox() {
  return (
    <div className="glass-card p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-warning" />
        <h3 className="text-lg font-semibold">The 4 Big Concepts</h3>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2">
        {concepts.map((concept, index) => {
          const Icon = concept.icon;
          
          return (
            <a
              key={index}
              href={concept.link}
              className="group flex gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all duration-200"
            >
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
            </a>
          );
        })}
      </div>
    </div>
  );
}
