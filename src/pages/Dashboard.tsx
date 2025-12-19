import { useState, useEffect, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { ControlPanel } from '@/components/ControlPanel';
import { TreeVisualization } from '@/components/TreeVisualization';
import { InfoPanel } from '@/components/InfoPanel';
import { ConsoleLog } from '@/components/ConsoleLog';
import { useProcessTree } from '@/hooks/useProcessTree';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RotateCcw, Footprints } from 'lucide-react';

const Dashboard = () => {
  const {
    root,
    logs,
    selectedNode,
    setSelectedNode,
    createRootProcess,
    forkProcess,
    waitProcess,
    exitProcess,
    resetTree,
  } = useProcessTree();

  const [forkDepth, setForkDepth] = useState(3);
  const [speed, setSpeed] = useState(1);
  const [stepMode, setStepMode] = useState(false);
  const [lastAction, setLastAction] = useState<string>();
  const [osExplanation, setOsExplanation] = useState<string>();
  const [dsaExplanation, setDsaExplanation] = useState<string>();

  const handleFork = useCallback(() => {
    if (!root) {
      createRootProcess();
      setLastAction('Created root process');
      setOsExplanation('The init process (PID 1) is the first process started by the kernel');
      setDsaExplanation('Root node of the tree created');
    } else if (selectedNode) {
      forkProcess(selectedNode.pid);
      setLastAction(`fork() called on PID ${selectedNode.pid}`);
      setOsExplanation('fork() creates a new child process with a unique PID');
      setDsaExplanation('New child node added to the selected parent node');
    }
  }, [root, selectedNode, createRootProcess, forkProcess]);

  const handleWait = useCallback(() => {
    if (selectedNode) {
      waitProcess(selectedNode.pid);
      setLastAction(`wait() called on PID ${selectedNode.pid}`);
      setOsExplanation('Parent blocks until one of its children terminates');
      setDsaExplanation('Similar to postorder traversal - children processed before parent continues');
    }
  }, [selectedNode, waitProcess]);

  const handleExit = useCallback(() => {
    if (selectedNode) {
      exitProcess(selectedNode.pid);
      setLastAction(`exit() called on PID ${selectedNode.pid}`);
      setOsExplanation('Process terminates and releases resources');
      setDsaExplanation('Node marked for removal from tree structure');
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
          </div>
          <Button variant="ghost" size="sm" onClick={resetTree} className="gap-2">
            <RotateCcw className="w-4 h-4" /> Reset
          </Button>
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
