import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { scenarios } from '@/data/scenarios';
import { Scenario, ProcessNode } from '@/types/process';
import { useProcessTree } from '@/hooks/useProcessTree';
import { useProcessTreeContext } from '@/contexts/ProcessTreeContext';
import { TreeVisualization } from '@/components/TreeVisualization';
import { ConsoleLog } from '@/components/ConsoleLog';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

const GuidedMode = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(
    (location.state?.scenario as Scenario) || scenarios[0]
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Get voice mode from context
  const { voiceModeEnabled, speakEvent, speakRaw } = useProcessTreeContext();

  const {
    root,
    logs,
    selectedNode,
    setSelectedNode,
    createRootProcess,
    forkProcess,
    waitProcess,
    exitProcess,
    resetTree
  } = useProcessTree();

  const initializeScenario = useCallback(() => {
    resetTree();
    setCurrentStepIndex(-1);
    setIsPlaying(false);
    setTimeout(() => {
      createRootProcess();
    }, 100);
  }, [resetTree, createRootProcess]);

  useEffect(() => {
    initializeScenario();
  }, [selectedScenario]);

  const executeStep = useCallback(() => {
    if (currentStepIndex >= selectedScenario.steps.length - 1) {
      setIsPlaying(false);
      return;
    }

    const nextIndex = currentStepIndex + 1;
    const step = selectedScenario.steps[nextIndex];
    setCurrentStepIndex(nextIndex);

    if (!root) return;

    switch (step.action) {
      case 'fork':
        // For guided mode, fork from root to show single fork behavior
        const newChild = forkProcess(root.pid);
        if (voiceModeEnabled && newChild) {
          speakEvent('process_created', { pid: newChild.pid, parentPid: root.pid });
        }
        break;
      case 'wait':
        waitProcess(root.pid);
        if (voiceModeEnabled) {
          const runningChildren = root.children.filter(c => c.state === 'running' || c.state === 'orphan');
          speakEvent('parent_waiting', { 
            pid: root.pid, 
            childPid: runningChildren.length > 0 ? runningChildren[0].pid : undefined 
          });
        }
        break;
      case 'exit':
        // Exit the first running child (zombie scenario)
        const children = root.children.filter(c => c.state === 'running' || c.state === 'orphan');
        if (children.length > 0) {
          const childPid = children[0].pid;
          const parentWaiting = root.state === 'waiting';
          exitProcess(childPid);
          
          if (voiceModeEnabled) {
            if (parentWaiting) {
              speakEvent('process_reaped', { pid: childPid, parentPid: root.pid });
            } else {
              speakEvent('zombie_created', { pid: childPid, parentPid: root.pid });
            }
          }
        }
        break;
      case 'orphan':
        // Orphan scenario: parent (root) exits while child is running
        const orphanChildren = root.children.filter(c => c.state === 'running' || c.state === 'orphan');
        exitProcess(root.pid);
        
        if (voiceModeEnabled && orphanChildren.length > 0) {
          speakEvent('orphan_adopted', { pid: orphanChildren[0].pid });
        }
        break;
      case 'explain':
        // Voice: read the OS explanation for this step
        if (voiceModeEnabled && step.osExplanation) {
          speakRaw(step.osExplanation);
        }
        break;
    }
  }, [currentStepIndex, selectedScenario, root, forkProcess, waitProcess, exitProcess, voiceModeEnabled, speakEvent, speakRaw]);

  // Voice mode delay: 2.5 seconds when enabled for guided explanations, otherwise 1.5s
  const stepDelay = voiceModeEnabled ? 2500 : 1500;

  useEffect(() => {
    if (isPlaying && currentStepIndex < selectedScenario.steps.length - 1) {
      const timer = setTimeout(executeStep, stepDelay);
      return () => clearTimeout(timer);
    } else if (currentStepIndex >= selectedScenario.steps.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentStepIndex, selectedScenario.steps.length, executeStep, stepDelay]);

  const currentStep = currentStepIndex >= 0 ? selectedScenario.steps[currentStepIndex] : null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container py-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Guided Learning Mode</h1>
          <p className="text-muted-foreground">
            Step-by-step walkthrough of process scenarios with explanations
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Scenario Selection & Steps */}
          <div className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Select Scenario</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {scenarios.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setSelectedScenario(s)}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          selectedScenario.id === s.id
                            ? 'bg-primary/20 border border-primary'
                            : 'bg-background hover:bg-muted'
                        }`}
                      >
                        <div className="font-medium text-sm">{s.title}</div>
                        <div className="text-xs text-muted-foreground">{s.description}</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedScenario.steps.map((step, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg text-sm transition-all ${
                        i === currentStepIndex
                          ? 'bg-primary/20 border border-primary'
                          : i < currentStepIndex
                          ? 'bg-muted/50'
                          : 'bg-background'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{i + 1}</Badge>
                        <span className="font-mono text-primary">{step.action}()</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentStepIndex(prev => Math.max(-1, prev - 1))}
                variant="outline"
                size="sm"
                disabled={currentStepIndex < 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setIsPlaying(!isPlaying)}
                size="sm"
                className="flex-1"
              >
                {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button onClick={executeStep} variant="outline" size="sm" disabled={currentStepIndex >= selectedScenario.steps.length - 1}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button onClick={initializeScenario} variant="outline" size="sm">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Visualization */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-card border-border min-h-[400px]">
              <CardContent className="p-0 h-[400px]">
                <TreeVisualization
                  root={root}
                  selectedNode={selectedNode}
                  onSelectNode={setSelectedNode}
                  onFork={(pid) => forkProcess(pid)}
                  onWait={(pid) => waitProcess(pid)}
                  onExit={(pid) => exitProcess(pid)}
                />
              </CardContent>
            </Card>

            {/* Current Step Explanation */}
            {currentStep && (
              <Card className="bg-primary/10 border-primary/30">
                <CardContent className="py-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-1">OS Concept</h4>
                      <p className="text-sm text-muted-foreground">{currentStep.osExplanation}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-1">DSA Concept</h4>
                      <p className="text-sm text-muted-foreground">{currentStep.dsaExplanation}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <ConsoleLog logs={logs} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default GuidedMode;
