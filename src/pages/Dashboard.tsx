import { useState, useEffect, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { ControlPanel } from '@/components/ControlPanel';
import { TreeVisualization } from '@/components/TreeVisualization';
import { InfoPanel } from '@/components/InfoPanel';
import { ConsoleLog } from '@/components/ConsoleLog';
import { useProcessTree } from '@/hooks/useProcessTree';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Footprints, AlertTriangle } from 'lucide-react';

const Dashboard = () => {
  const {
    root,
    logs,
    selectedNode,
    forkCount,
    setSelectedNode,
    createRootProcess,
    forkProcess,
    forkAllProcesses,
    waitProcess,
    exitProcess,
    resetTree,
    getAllRunningProcesses,
  } = useProcessTree();

  const [forkDepth, setForkDepth] = useState(3);
  const [speed, setSpeed] = useState(1);
  const [stepMode, setStepMode] = useState(false);
  const [lastAction, setLastAction] = useState<string>();
  const [osExplanation, setOsExplanation] = useState<string>();
  const [dsaExplanation, setDsaExplanation] = useState<string>();

  const runningCount = root ? getAllRunningProcesses(root).length : 0;

  const handleFork = useCallback(() => {
    if (!root) {
      createRootProcess();
      setLastAction('Created root process (PID 1001)');
      setOsExplanation('The first user process is created. init (PID 1) already exists to adopt orphans.');
      setDsaExplanation('Root node of the process tree created. This is the ancestor of all child processes.');
    } else {
      // CORRECT: Fork ALL running processes
      const newChildren = forkAllProcesses();
      const expectedTotal = Math.pow(2, forkCount + 1);
      setLastAction(`fork() called - ${newChildren.length} new processes created`);
      setOsExplanation(
        `fork() duplicates EVERY running process. Before: ${runningCount} processes. After: ${runningCount + newChildren.length} processes (expected: 2^${forkCount + 1} = ${expectedTotal}). Returns 0 to child, child_pid to parent.`
      );
      setDsaExplanation(
        `Each node at the current level spawns one child. Tree depth increases. This is exponential growth: n sequential forks create 2^n processes.`
      );
    }
  }, [root, forkCount, runningCount, createRootProcess, forkAllProcesses]);


  const handleWait = useCallback(() => {
    if (selectedNode) {
      waitProcess(selectedNode.pid);
      setLastAction(`wait() called by PID ${selectedNode.pid}`);
      setOsExplanation('wait() blocks the parent until a child terminates. If child already exited (zombie), it reaps it immediately. Prevents zombie accumulation.');
      setDsaExplanation('Postorder traversal pattern: children must complete before parent continues. Parent waits at this node.');
    }
  }, [selectedNode, waitProcess]);

  const handleExit = useCallback(() => {
    if (selectedNode) {
      const hasChildren = selectedNode.children.some(c => c.state === 'running');
      exitProcess(selectedNode.pid);
      setLastAction(`exit() called by PID ${selectedNode.pid}`);
      if (hasChildren) {
        setOsExplanation('Process exited with running children → children become ORPHANS. They are re-parented to init (PID 1) which will eventually wait() for them.');
        setDsaExplanation('Deleting an internal node: children must be moved to another parent (init). Maintains tree integrity.');
      } else {
        setOsExplanation('Process exited. If parent was waiting → normal termination. If parent NOT waiting → becomes ZOMBIE until parent calls wait().');
        setDsaExplanation('Leaf node removal. Node state changes but structure preserved until parent acknowledges.');
      }
    }
  }, [selectedNode, exitProcess]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case 'f': handleFork(); break;
        case 'w': handleWait(); break;
        case 'x': handleExit(); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFork, handleWait, handleExit]);

  const canWait = selectedNode?.state === 'running' && (selectedNode?.children.length ?? 0) > 0;
  const canKill = selectedNode?.state === 'running';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      {/* Top Bar */}
      <div className="border-b border-border bg-card/50 px-4 py-2">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={stepMode} onCheckedChange={setStepMode} />
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Footprints className="w-4 h-4" /> Step Mode
              </span>
            </div>
            {root && (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono">
                  Fork #{forkCount}
                </Badge>
                <Badge variant="secondary" className="font-mono">
                  Running: {runningCount}
                </Badge>
                <Badge variant="secondary" className="font-mono">
                  Expected: 2^{forkCount} = {Math.pow(2, forkCount)}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              <AlertTriangle className="w-3 h-3 text-yellow-500" />
              Execution order is scheduler-dependent
            </div>
            <Button variant="ghost" size="sm" onClick={resetTree} className="gap-2">
              <RotateCcw className="w-4 h-4" /> Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 container py-4">
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-180px)]">
          {/* Left Control Panel */}
          <div className="col-span-12 md:col-span-3 lg:col-span-2">
            <ControlPanel
              onFork={handleFork}
              onWait={handleWait}
              onKill={handleExit}
              onReset={resetTree}
              forkDepth={forkDepth}
              setForkDepth={setForkDepth}
              speed={speed}
              setSpeed={setSpeed}
              hasSelection={!!selectedNode}
              canWait={canWait}
              canKill={canKill}
            />
          </div>

          {/* Center Visualization */}
          <div className="col-span-12 md:col-span-6 lg:col-span-7 flex flex-col gap-4">
            <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden">
              <TreeVisualization
                root={root}
                selectedNode={selectedNode}
                onSelectNode={setSelectedNode}
                onFork={(pid) => forkProcess(pid)}
                onWait={(pid) => waitProcess(pid)}
                onExit={(pid) => exitProcess(pid)}
              />
            </div>
            <ConsoleLog logs={logs} />
          </div>

          {/* Right Info Panel */}
          <div className="col-span-12 md:col-span-3 lg:col-span-3">
            <InfoPanel
              selectedNode={selectedNode}
              lastAction={lastAction}
              osExplanation={osExplanation}
              dsaExplanation={dsaExplanation}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
