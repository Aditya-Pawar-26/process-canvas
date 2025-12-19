import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { ScenarioCard } from '@/components/ScenarioCard';
import { scenarios } from '@/data/scenarios';
import { Scenario } from '@/types/process';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Scenarios = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');

  const filteredScenarios = filter === 'all' 
    ? scenarios 
    : scenarios.filter(s => s.difficulty === filter);

  const handleRunScenario = (scenario: Scenario) => {
    navigate('/dashboard', { state: { scenario } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Scenario Library</h1>
          <p className="text-muted-foreground">
            Learn through predefined OS scenarios with visual demonstrations
          </p>
        </div>

        {/* Filters */}
        <div className="flex justify-center gap-2 mb-8">
          {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((level) => (
            <Button
              key={level}
              variant={filter === level ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(level)}
              className="capitalize"
            >
              {level}
            </Button>
          ))}
        </div>

        {/* Scenario Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onRun={handleRunScenario}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Scenarios;
