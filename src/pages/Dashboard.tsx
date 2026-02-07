import { useState, useEffect, useCallback, useMemo } from 'react';
import { ProcessNode } from '@/types/process';
import { Navigation } from '@/components/Navigation';
import { ControlPanel } from '@/components/ControlPanel';
import { TreeVisualization } from '@/components/TreeVisualization';
import { InfoPanel } from '@/components/InfoPanel';
import { ConsoleLog } from '@/components/ConsoleLog';
import { ExecutionTimeline } from '@/components/ExecutionTimeline';
import { useProcessTreeContext } from '@/contexts/ProcessTreeContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Footprints, AlertTriangle, Play, Target, Maximize, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Dashboard = () => {
  const {
    root,
    logs,
    selectedNode,
    forkCount,
    executionMode,
    executionBoundaryPid,
    executedPids,
    executionComplete,
    currentExecutingPid,
    logicalTime,
    executionPath,
    isAutoPlaying,
    speed,
    globalLogicalTime,
    voiceModeEnabled,
    speakEvent,
    setSelectedNode,
    setExecutionMode,
    createRootProcess,
    forkProcess,
    forkAllProcesses,
    waitProcess,
    exitProcess,
    resetTree,
    getAllRunningProcesses,
    getAncestorChain,
    startScopedExecution,
    executeNextScopedStep,
    resetScopedExecution,
    setIsAutoPlaying,
    setSpeed,
    recordExecution,
    incrementGlobalTime,
  } = useProcessTreeContext();

  const [forkDepth, setForkDepth] = useState(3);
  const [stepMode, setStepMode] = useState(false);
  const [lastAction, setLastAction] = useState<string>();
  const [osExplanation, setOsExplanation] = useState<string>();
  const [dsaExplanation, setDsaExplanation] = useState<string>();
  const [selectedExitPid, setSelectedExitPid] = useState<number | null>(null);

  const runningCount = root ? getAllRunningProcesses(root).length : 0;

  // Compute execution path PIDs for visualization
  const executionPathPids = useMemo(() => {
    if (executionMode === 'full' || !executionBoundaryPid) {
      return new Set<number>();
    }
    // Use the stored execution path for consistency
    return new Set(executionPath.length > 0 ? executionPath : getAncestorChain(executionBoundaryPid));
  }, [executionMode, executionBoundaryPid, executionPath, getAncestorChain]);

  // Is scoped execution active?
  const isScopedExecution = executionMode === 'until-selected' && executionBoundaryPid !== null;

  const handleFork = useCallback(() => {
    if (!root) {
      const newRoot = createRootProcess();
      setLastAction('Created root process (PID 1001)');
      setOsExplanation('The first user process is created. init (PID 1) already exists to adopt orphans.');
      setDsaExplanation('Root node of the process tree created. This is the ancestor of all child processes.');
      
      // Voice narration for process creation
      if (voiceModeEnabled) {
        speakEvent('process_created', { pid: newRoot.pid });
      }
    } else {
      const newChildren = forkAllProcesses();
      const expectedTotal = Math.pow(2, forkCount + 1);
      setLastAction(`fork() called - ${newChildren.length} new processes created`);
      setOsExplanation(
        `fork() duplicates EVERY running process. Before: ${runningCount} processes. After: ${runningCount + newChildren.length} processes (expected: 2^${forkCount + 1} = ${expectedTotal}). Returns 0 to child, child_pid to parent.`
      );
      setDsaExplanation(
        `Each node at the current level spawns one child. Tree depth increases. This is exponential growth: n sequential forks create 2^n processes.`
      );
      
      // Voice narration for each new child
      if (voiceModeEnabled && newChildren.length > 0) {
        // Speak about the first child creation to avoid overwhelming audio
        const firstChild = newChildren[0];
        speakEvent('process_created', { pid: firstChild.pid, parentPid: firstChild.ppid });
      }
    }
  }, [root, forkCount, runningCount, createRootProcess, forkAllProcesses, voiceModeEnabled, speakEvent]);


  const handleWait = useCallback(() => {
    if (selectedNode) {
      waitProcess(selectedNode.pid);
      setLastAction(`wait() called by PID ${selectedNode.pid}`);
      setOsExplanation('wait() blocks the parent until a child terminates. If child already exited (zombie), it reaps it immediately. Prevents zombie accumulation.');
      setDsaExplanation('Postorder traversal pattern: children must complete before parent continues. Parent waits at this node.');
      
      // Voice narration for parent waiting
      if (voiceModeEnabled) {
        const runningChildren = selectedNode.children.filter(c => c.state === 'running' || c.state === 'orphan');
        speakEvent('parent_waiting', { 
          pid: selectedNode.pid, 
          childPid: runningChildren.length > 0 ? runningChildren[0].pid : undefined 
        });
      }
    }
  }, [selectedNode, waitProcess, voiceModeEnabled, speakEvent]);

  const handleExit = useCallback((pid?: number) => {
    const targetPid = pid ?? selectedNode?.pid;
    if (!targetPid) return;
    
    const targetNode = pid ? getAllRunningProcesses(root).find(p => p.pid === pid) ?? selectedNode : selectedNode;
    if (!targetNode) return;
    
    const hasChildren = targetNode.children.some(c => c.state === 'running' || c.state === 'orphan');
    const parentNode = root ? getAllRunningProcesses(root).find(p => p.pid === targetNode.ppid) : null;
    const parentWasWaiting = parentNode?.state === 'waiting';
    
    exitProcess(targetPid);
    setLastAction(`exit() called by PID ${targetPid}`);
    
    if (hasChildren) {
      setOsExplanation('Process exited with running children → children become ORPHANS. They are re-parented to init (PID 1) which will eventually wait() for them.');
      setDsaExplanation('Deleting an internal node: children must be moved to another parent (init). Maintains tree integrity.');
      
      // Voice: orphan adoption
      if (voiceModeEnabled) {
        const orphanChild = targetNode.children.find(c => c.state === 'running' || c.state === 'orphan');
        if (orphanChild) {
          speakEvent('orphan_adopted', { pid: orphanChild.pid });
        }
      }
    } else {
      setOsExplanation('Process exited. If parent was waiting → normal termination. If parent NOT waiting → becomes ZOMBIE until parent calls wait().');
      setDsaExplanation('Leaf node removal. Node state changes but structure preserved until parent acknowledges.');
      
      // Voice: normal exit or zombie
      if (voiceModeEnabled) {
        if (parentWasWaiting) {
          speakEvent('process_reaped', { pid: targetPid, parentPid: targetNode.ppid });
        } else if (parentNode && parentNode.state === 'running') {
          speakEvent('zombie_created', { pid: targetPid, parentPid: targetNode.ppid });
        } else {
          speakEvent('process_exit', { pid: targetPid });
        }
      }
    }
  }, [selectedNode, root, exitProcess, getAllRunningProcesses, voiceModeEnabled, speakEvent]);

  // Handle scoped execution step
  const handleScopedStep = useCallback(() => {
    if (!isScopedExecution) return;
    
    const executedNode = executeNextScopedStep();
    if (executedNode) {
      setLastAction(`Executed step for PID ${executedNode.pid}`);
      setOsExplanation(
        `Hierarchical execution: Parent processes must execute before their children. This enforces UNIX process dependency rules.`
      );
      setDsaExplanation(
        `Tree traversal follows the root-to-target path. Each node in the ancestor chain executes in order, demonstrating preorder traversal semantics.`
      );
    }
  }, [isScopedExecution, executeNextScopedStep]);

  // Start scoped execution for selected node
  const handleStartScopedExecution = useCallback(() => {
    if (selectedNode && executionMode === 'until-selected') {
      startScopedExecution(selectedNode.pid);
      setLastAction(`Started scoped execution until PID ${selectedNode.pid}`);
      setOsExplanation(
        `Scoped execution simulates partial process tree execution. Only the path from root to the selected node will be executed, demonstrating hierarchical dependency.`
      );
      setDsaExplanation(
        `This is analogous to finding a path from root to target in a tree. Only ancestor nodes are visited.`
      );
    }
  }, [selectedNode, executionMode, startScopedExecution]);

  // Helper: Get all processes that can act (running or waiting with running children)
  const getActiveProcesses = useCallback((node: ProcessNode | null): ProcessNode[] => {
    if (!node) return [];
    const result: ProcessNode[] = [];
    if (node.state === 'running' || node.state === 'orphan' || node.state === 'waiting') {
      result.push(node);
    }
    for (const child of node.children) {
      result.push(...getActiveProcesses(child));
    }
    return result;
  }, []);

  // Helper: Check if a process is a leaf (no running/orphan children)
  const isLeafProcess = useCallback((node: ProcessNode): boolean => {
    return !node.children.some(c => c.state === 'running' || c.state === 'orphan');
  }, []);

  // Helper: Get leaf processes (bottom of tree, ready to exit)
  const getLeafProcesses = useCallback((node: ProcessNode | null): ProcessNode[] => {
    if (!node) return [];
    const result: ProcessNode[] = [];
    
    if ((node.state === 'running' || node.state === 'orphan') && isLeafProcess(node)) {
      result.push(node);
    }
    
    for (const child of node.children) {
      result.push(...getLeafProcesses(child));
    }
    return result;
  }, [isLeafProcess]);

  // Helper: Get non-leaf running processes that have running children but aren't waiting yet
  const getParentsNotWaiting = useCallback((node: ProcessNode | null): ProcessNode[] => {
    if (!node) return [];
    const result: ProcessNode[] = [];
    
    if (node.state === 'running' && !isLeafProcess(node)) {
      // Parent with running children that isn't waiting yet
      result.push(node);
    }
    
    for (const child of node.children) {
      result.push(...getParentsNotWaiting(child));
    }
    return result;
  }, [isLeafProcess]);

  // Auto-play effect: UNIX-correct bottom-up execution
  // 1. Parents enter WAITING state first (call wait())
  // 2. Leaf children exit (bottom-up)
  // 3. Parents are resumed after reaping children
  useEffect(() => {
    if (!isAutoPlaying || !root) return;

    const allActive = getActiveProcesses(root);
    const runningOrOrphan = allActive.filter(p => p.state === 'running' || p.state === 'orphan');
    
    // Stop if no more running/orphan processes
    if (runningOrOrphan.length === 0) {
      setIsAutoPlaying(false);
      setLastAction('Auto-execution complete - all processes terminated');
      setOsExplanation('All processes have terminated. The simulation has reached a stable state with correct UNIX lifecycle completion.');
      return;
    }

    const intervalId = setInterval(() => {
      incrementGlobalTime();
      
      // Step 1: Find parents that have running children but haven't called wait() yet
      const parentsNotWaiting = getParentsNotWaiting(root);
      
      if (parentsNotWaiting.length > 0) {
        // Make the deepest parent call wait() first (bottom-up parent waiting)
        const deepestParent = parentsNotWaiting.reduce((a, b) => a.depth > b.depth ? a : b);
        waitProcess(deepestParent.pid);
        recordExecution(deepestParent.pid, 'wait', 'waiting');
        setLastAction(`Auto: PID ${deepestParent.pid} called wait() - blocking for child`);
        setOsExplanation(`Parent process ${deepestParent.pid} is now WAITING for its children to exit. This is required before children can be reaped cleanly.`);
        setDsaExplanation(`Bottom-up traversal: parent nodes must wait before leaf nodes can be processed and removed.`);
        return;
      }
      
      // Step 2: All eligible parents are waiting - now exit leaf processes
      const leaves = getLeafProcesses(root);
      
      if (leaves.length > 0) {
        // Exit the deepest leaf first (true bottom-up)
        const deepestLeaf = leaves.reduce((a, b) => a.depth > b.depth ? a : b);
        exitProcess(deepestLeaf.pid);
        recordExecution(deepestLeaf.pid, 'exit', 'terminated');
        setLastAction(`Auto: PID ${deepestLeaf.pid} called exit()`);
        setOsExplanation(`Leaf process ${deepestLeaf.pid} exited. Since parent was WAITING, child is reaped immediately - no zombie created.`);
        setDsaExplanation(`Postorder traversal: children complete before parents. Leaf node removed from tree.`);
        return;
      }
      
      // No more work to do
      setIsAutoPlaying(false);
    }, speed);

    return () => clearInterval(intervalId);
  }, [isAutoPlaying, root, speed, getActiveProcesses, getLeafProcesses, getParentsNotWaiting, waitProcess, exitProcess, incrementGlobalTime, recordExecution, setIsAutoPlaying]);

  const handlePlayPause = useCallback(() => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      setLastAction('Auto-execution paused');
      setOsExplanation('Execution paused. Press Play to resume automatic process lifecycle execution.');
    } else {
      setIsAutoPlaying(true);
      setLastAction('Auto-execution started');
      setOsExplanation('Processes will exit automatically according to the scheduler. Parent-child dependencies will be enforced with UNIX semantics (zombies, orphans, reaping).');
    }
  }, [isAutoPlaying, setIsAutoPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case 'f': handleFork(); break;
        case 'w': handleWait(); break;
        case 'x': handleExit(); break;
        case 'n': if (isScopedExecution) handleScopedStep(); break;
        case ' ': 
          e.preventDefault(); // Prevent page scroll
          if (runningCount > 0) handlePlayPause(); 
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFork, handleWait, handleExit, handleScopedStep, handlePlayPause, isScopedExecution, runningCount]);

  const canWait = selectedNode?.state === 'running' && (selectedNode?.children.length ?? 0) > 0;
  const canKill = selectedNode?.state === 'running';
  const canStartScoped = executionMode === 'until-selected' && selectedNode && !executionBoundaryPid;

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
                <Badge variant="outline" className="font-mono">
                  t = {globalLogicalTime}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/gantt">
              <Button variant="outline" size="sm" className="gap-2">
                <Clock className="w-4 h-4" />
                Gantt Chart
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              <AlertTriangle className="w-3 h-3 text-process-waiting" />
              Execution order is scheduler-dependent
            </div>
            <Button variant="ghost" size="sm" onClick={() => { resetTree(); resetScopedExecution(); }} className="gap-2">
              <RotateCcw className="w-4 h-4" /> Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Execution Mode Bar */}
      <div className="border-b border-border bg-muted/30 px-4 py-2">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Execution Mode:</span>
              <Select
                value={executionMode}
                onValueChange={(v) => {
                  setExecutionMode(v as 'full' | 'until-selected');
                  resetScopedExecution();
                }}
              >
                <SelectTrigger className="w-[200px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">
                    <div className="flex items-center gap-2">
                      <Maximize className="w-4 h-4" />
                      Run Full Execution
                    </div>
                  </SelectItem>
                  <SelectItem value="until-selected">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Run Until Selected Node
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {executionMode === 'until-selected' && (
              <div className="flex items-center gap-2">
                {!executionBoundaryPid && selectedNode && (
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={handleStartScopedExecution}
                    className="gap-1"
                  >
                    <Target className="w-4 h-4" />
                    Set PID {selectedNode.pid} as boundary
                  </Button>
                )}
                {!executionBoundaryPid && !selectedNode && (
                  <span className="text-sm text-muted-foreground">
                    Select a node to set as execution boundary
                  </span>
                )}
                {executionBoundaryPid && (
                  <>
                    <Badge variant="outline" className="font-mono">
                      <Target className="w-3 h-3 mr-1" />
                      Boundary: PID {executionBoundaryPid}
                    </Badge>
                    <Badge variant="secondary" className="font-mono">
                      t={logicalTime} / {executionPath.length}
                    </Badge>
                    <Badge variant="outline" className="font-mono text-xs">
                      Path: {executionPath.join(' → ')}
                    </Badge>
                    {!executionComplete && (
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={handleScopedStep}
                        className="gap-1"
                      >
                        <Play className="w-4 h-4" />
                        Execute Next (N)
                      </Button>
                    )}
                    {executionComplete && (
                      <Badge variant="default" className="bg-process-running text-process-running-foreground">
                        ✓ Execution Complete
                      </Badge>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={resetScopedExecution}
                    >
                      Clear Boundary
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 container py-4">
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-240px)]">
          {/* Left Control Panel */}
          <div className="col-span-12 md:col-span-3 lg:col-span-2">
            <ControlPanel
              onFork={handleFork}
              onWait={handleWait}
              onKill={handleExit}
              onReset={() => { resetTree(); resetScopedExecution(); }}
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
                executionPathPids={executionPathPids}
                executedPids={executedPids}
                currentExecutingPid={currentExecutingPid}
                isScopedExecution={isScopedExecution}
              />
            </div>
            
            {/* Execution Timeline - only show during scoped execution */}
            {isScopedExecution && executionPath.length > 0 && (
              <ExecutionTimeline
                executionPath={executionPath}
                executedPids={executedPids}
                currentExecutingPid={currentExecutingPid}
                logicalTime={logicalTime}
                executionComplete={executionComplete}
                boundaryPid={executionBoundaryPid}
              />
            )}
            
            <ConsoleLog 
              logs={logs} 
              root={root}
              onExitProcess={handleExit}
              selectedExitPid={selectedExitPid}
              onSelectExitPid={setSelectedExitPid}
              isAutoPlaying={isAutoPlaying}
              onPlayPause={handlePlayPause}
              speed={speed}
              onSpeedChange={setSpeed}
              hasRunningProcesses={runningCount > 0}
            />
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
