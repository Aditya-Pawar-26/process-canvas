import { Scenario } from '@/types/process';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, GitFork, Clock, Skull, User, TreeDeciduous } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScenarioCardProps {
  scenario: Scenario;
  onRun: (scenario: Scenario) => void;
}

export const ScenarioCard = ({ scenario, onRun }: ScenarioCardProps) => {
  const difficultyColors = {
    beginner: 'bg-process-running/20 text-process-running border-process-running/50',
    intermediate: 'bg-process-waiting/20 text-process-waiting border-process-waiting/50',
    advanced: 'bg-process-zombie/20 text-process-zombie border-process-zombie/50',
  };

  const getScenarioIcon = () => {
    switch (scenario.id) {
      case 'single-fork':
      case 'multiple-fork':
        return GitFork;
      case 'parent-wait':
        return Clock;
      case 'zombie-process':
        return Skull;
      case 'orphan-process':
        return User;
      case 'recursive-fork':
        return TreeDeciduous;
      default:
        return GitFork;
    }
  };

  const Icon = getScenarioIcon();

  return (
    <div className="scenario-card group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <Badge 
          variant="outline" 
          className={cn('text-xs', difficultyColors[scenario.difficulty])}
        >
          {scenario.difficulty}
        </Badge>
      </div>

      <h3 className="font-semibold text-foreground mb-1">{scenario.title}</h3>
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {scenario.description}
      </p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">OS:</span>
          <span className="text-foreground">{scenario.osConcept}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">DSA:</span>
          <span className="text-foreground">{scenario.dsaConcept}</span>
        </div>
      </div>

      {/* Mini tree preview */}
      <div className="mb-4 p-3 bg-background/50 rounded-lg">
        <div className="flex justify-center">
          <div className="w-3 h-3 rounded-full bg-process-running mb-1" />
        </div>
        <div className="flex justify-center gap-2 mt-1">
          {scenario.steps.filter(s => s.action === 'fork').map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-px h-2 bg-primary/50" />
              <div className="w-2 h-2 rounded-full bg-primary/50" />
            </div>
          ))}
        </div>
      </div>

      <Button 
        onClick={() => onRun(scenario)}
        className="w-full gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
        variant="outline"
      >
        <Play className="w-4 h-4" />
        Run Scenario
      </Button>
    </div>
  );
};
