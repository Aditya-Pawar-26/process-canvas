import { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigation } from '@/components/Navigation';
import { useProcessTreeContext, ExecutionEvent } from '@/contexts/ProcessTreeContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ProcessNode } from '@/types/process';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Clock,
  AlertTriangle,
  TreeDeciduous,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Gantt bar component for a single process
interface GanttBarProps {
  pid: number;
  events: ExecutionEvent[];
  maxTime: number;
  currentTime: number;
  state: 'running' | 'waiting' | 'zombie' | 'orphan' | 'terminated' | 'none';
  isSelected: boolean;
  onClick: () => void;
}

const GanttBar = ({ pid, events, maxTime, currentTime, state, isSelected, onClick }: GanttBarProps) => {
  const timeSlots = maxTime + 1;
  
  // Build time-based state array
  const stateAtTime = useMemo(() => {
    const states: (ExecutionEvent['state'] | null)[] = new Array(timeSlots).fill(null);
    
    events.forEach(event => {
      const start = event.startTime;
      const end = event.endTime ?? currentTime;
      
      for (let t = start; t <= Math.min(end, timeSlots - 1); t++) {
        // Only mark as running if actually running (not waiting/zombie)
        if (event.state === 'running' || event.state === 'orphan') {
          states[t] = event.state;
        } else if (event.state === 'waiting') {
          states[t] = 'waiting';
        } else if (event.state === 'zombie') {
          states[t] = 'zombie';
        } else if (event.state === 'terminated') {
          states[t] = 'terminated';
        }
      }
    });
    
    return states;
  }, [events, timeSlots, currentTime]);
  
  const getStateColor = (s: ExecutionEvent['state'] | null) => {
    switch (s) {
      case 'running': return 'bg-process-running';
      case 'orphan': return 'bg-process-orphan';
      case 'waiting': return 'bg-process-waiting';
      case 'zombie': return 'bg-process-zombie';
      case 'terminated': return 'bg-muted';
      default: return 'bg-transparent';
    }
  };
  
  return (
    <div 
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all",
        isSelected && "bg-primary/10 ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      {/* PID label */}
      <div className="w-20 flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={cn(
            "font-mono",
            state === 'running' && "border-process-running text-process-running",
            state === 'waiting' && "border-process-waiting text-process-waiting",
            state === 'zombie' && "border-process-zombie text-process-zombie",
            state === 'orphan' && "border-process-orphan text-process-orphan",
            state === 'terminated' && "border-muted-foreground text-muted-foreground"
          )}
        >
          PID {pid}
        </Badge>
      </div>
      
      {/* Gantt bar */}
      <div className="flex-1 flex gap-px">
        {stateAtTime.map((s, t) => (
          <div
            key={t}
            className={cn(
              "h-8 min-w-[30px] flex-1 rounded-sm transition-all",
              getStateColor(s),
              t === currentTime && s && "ring-2 ring-foreground ring-offset-1 ring-offset-background",
              !s && "border border-dashed border-border"
            )}
            title={`t=${t}: ${s || 'inactive'}`}
          />
        ))}
      </div>
    </div>
  );
};

const GanttChart = () => {
  const {
    root,
    logs,
    selectedNode,
    forkCount,
    globalLogicalTime,
    executionHistory,
    isAutoPlaying,
    speed,
    setSelectedNode,
    forkAllProcesses,
    waitProcess,
    exitProcess,
    resetTree,
    getAllNodes,
    getAllRunningProcesses,
    setIsAutoPlaying,
    setSpeed,
    recordExecution,
    incrementGlobalTime,
    resetExecutionHistory,
  } = useProcessTreeContext();
  
  // Get all processes for the Y-axis
  const allProcesses = useMemo(() => {
    if (!root) return [];
    return getAllNodes(root).sort((a, b) => a.pid - b.pid);
  }, [root, getAllNodes]);
  
  // Get events grouped by PID
  const eventsByPid = useMemo(() => {
    const map = new Map<number, ExecutionEvent[]>();
    executionHistory.forEach(event => {
      const existing = map.get(event.pid) || [];
      map.set(event.pid, [...existing, event]);
    });
    return map;
  }, [executionHistory]);
  
  // Determine max time for display
  const maxDisplayTime = Math.max(globalLogicalTime + 5, 10);
  
  const runningCount = root ? getAllRunningProcesses(root).length : 0;
  
  // Helper functions for auto-play (same as Dashboard)
  const isLeafProcess = useCallback((node: ProcessNode): boolean => {
    return !node.children.some(c => c.state === 'running' || c.state === 'orphan');
  }, []);

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

  const getParentsNotWaiting = useCallback((node: ProcessNode | null): ProcessNode[] => {
    if (!node) return [];
    const result: ProcessNode[] = [];
    
    if (node.state === 'running' && !isLeafProcess(node)) {
      result.push(node);
    }
    
    for (const child of node.children) {
      result.push(...getParentsNotWaiting(child));
    }
    return result;
  }, [isLeafProcess]);

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

  // Auto-play effect (UNIX-correct bottom-up)
  useEffect(() => {
    if (!isAutoPlaying || !root) return;

    const allActive = getActiveProcesses(root);
    const runningOrOrphan = allActive.filter(p => p.state === 'running' || p.state === 'orphan');
    
    if (runningOrOrphan.length === 0) {
      setIsAutoPlaying(false);
      return;
    }

    const intervalId = setInterval(() => {
      incrementGlobalTime();
      
      const parentsNotWaiting = getParentsNotWaiting(root);
      
      if (parentsNotWaiting.length > 0) {
        const deepestParent = parentsNotWaiting.reduce((a, b) => a.depth > b.depth ? a : b);
        waitProcess(deepestParent.pid);
        recordExecution(deepestParent.pid, 'wait', 'waiting');
        return;
      }
      
      const leaves = getLeafProcesses(root);
      
      if (leaves.length > 0) {
        const deepestLeaf = leaves.reduce((a, b) => a.depth > b.depth ? a : b);
        exitProcess(deepestLeaf.pid);
        recordExecution(deepestLeaf.pid, 'exit', 'terminated');
        return;
      }
      
      setIsAutoPlaying(false);
    }, speed);

    return () => clearInterval(intervalId);
  }, [isAutoPlaying, root, speed, getActiveProcesses, getLeafProcesses, getParentsNotWaiting, waitProcess, exitProcess, incrementGlobalTime, recordExecution, setIsAutoPlaying]);

  // Execute single step
  const executeNextStep = useCallback(() => {
    if (!root) return;
    
    incrementGlobalTime();
    
    const parentsNotWaiting = getParentsNotWaiting(root);
    
    if (parentsNotWaiting.length > 0) {
      const deepestParent = parentsNotWaiting.reduce((a, b) => a.depth > b.depth ? a : b);
      waitProcess(deepestParent.pid);
      recordExecution(deepestParent.pid, 'wait', 'waiting');
      return;
    }
    
    const leaves = getLeafProcesses(root);
    
    if (leaves.length > 0) {
      const deepestLeaf = leaves.reduce((a, b) => a.depth > b.depth ? a : b);
      exitProcess(deepestLeaf.pid);
      recordExecution(deepestLeaf.pid, 'exit', 'terminated');
    }
  }, [root, incrementGlobalTime, getParentsNotWaiting, getLeafProcesses, waitProcess, exitProcess, recordExecution]);

  const handlePlayPause = useCallback(() => {
    setIsAutoPlaying(!isAutoPlaying);
  }, [isAutoPlaying, setIsAutoPlaying]);

  const handleReset = useCallback(() => {
    resetTree();
    resetExecutionHistory();
  }, [resetTree, resetExecutionHistory]);

  // Record initial process creation when forks happen
  const handleFork = useCallback(() => {
    if (!root) {
      // Will create root - we'll track in next render
    }
    forkAllProcesses();
    
    // Record all currently running processes
    if (root) {
      getAllRunningProcesses(root).forEach(p => {
        if (!eventsByPid.has(p.pid)) {
          recordExecution(p.pid, 'created', 'running', p.ppid);
        }
      });
    }
  }, [root, forkAllProcesses, getAllRunningProcesses, recordExecution, eventsByPid]);

  // Track new processes after fork
  useEffect(() => {
    if (root) {
      allProcesses.forEach(p => {
        if (p.state === 'running' && !eventsByPid.has(p.pid)) {
          recordExecution(p.pid, 'created', 'running', p.ppid);
        }
      });
    }
  }, [allProcesses, eventsByPid, recordExecution, root]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      {/* Header */}
      <div className="border-b border-border bg-card/50 px-4 py-3">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Gantt Chart</h1>
            <Badge variant="outline" className="font-mono">
              t = {globalLogicalTime}
            </Badge>
            {root && (
              <>
                <Badge variant="secondary" className="font-mono">
                  Fork #{forkCount}
                </Badge>
                <Badge variant="secondary" className="font-mono">
                  Processes: {allProcesses.length}
                </Badge>
                <Badge variant="secondary" className="font-mono">
                  Running: {runningCount}
                </Badge>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              <AlertTriangle className="w-3 h-3 text-process-waiting" />
              State synced with Dashboard
            </div>
            <Link to="/dashboard">
              <Button variant="outline" size="sm" className="gap-2">
                <TreeDeciduous className="w-4 h-4" />
                View Tree
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="container flex items-center gap-4">
          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <Button
              variant={isAutoPlaying ? "destructive" : "default"}
              size="sm"
              onClick={handlePlayPause}
              disabled={runningCount === 0}
              className="gap-2"
            >
              {isAutoPlaying ? (
                <>
                  <Pause className="w-4 h-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Play
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={executeNextStep}
              disabled={isAutoPlaying || runningCount === 0}
              className="gap-2"
            >
              <SkipForward className="w-4 h-4" /> Step
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </Button>
          </div>
          
          {/* Speed slider */}
          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm text-muted-foreground">Speed:</span>
            <Slider
              value={[speed]}
              onValueChange={([v]) => setSpeed(v)}
              min={200}
              max={2000}
              step={100}
              className="w-32"
            />
            <span className="text-xs text-muted-foreground font-mono w-16">
              {speed}ms
            </span>
          </div>
          
          {/* Fork button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleFork}
            className="ml-auto gap-2"
          >
            Fork All Processes
          </Button>
        </div>
      </div>

      {/* Gantt Chart Area */}
      <div className="flex-1 container py-4 overflow-auto">
        {!root ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-240px)] text-muted-foreground">
            <Clock className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg mb-2">No processes to display</p>
            <p className="text-sm mb-4">Create processes in the Dashboard or click Fork above</p>
            <div className="flex gap-2">
              <Link to="/dashboard">
                <Button variant="default" className="gap-2">
                  <TreeDeciduous className="w-4 h-4" />
                  Go to Dashboard
                </Button>
              </Link>
              <Button variant="outline" onClick={handleFork}>
                Create Process Tree
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-4">
            {/* Time axis header */}
            <div className="flex items-center gap-2 mb-4 ml-[88px]">
              <div className="flex-1 flex gap-px">
                {Array.from({ length: maxDisplayTime }, (_, t) => (
                  <div
                    key={t}
                    className={cn(
                      "min-w-[30px] flex-1 text-center text-xs font-mono",
                      t === globalLogicalTime ? "text-primary font-bold" : "text-muted-foreground"
                    )}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
            
            {/* X-axis label */}
            <div className="flex items-center justify-center mb-4 ml-[88px]">
              <span className="text-xs text-muted-foreground">Logical Time (t)</span>
            </div>
            
            {/* Process rows */}
            <div className="space-y-1">
              {allProcesses.map(process => (
                <GanttBar
                  key={process.pid}
                  pid={process.pid}
                  events={eventsByPid.get(process.pid) || []}
                  maxTime={maxDisplayTime - 1}
                  currentTime={globalLogicalTime}
                  state={process.state}
                  isSelected={selectedNode?.pid === process.pid}
                  onClick={() => setSelectedNode(process)}
                />
              ))}
            </div>
            
            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-border flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-process-running" />
                <span>Running</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-process-waiting" />
                <span>Waiting</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-process-zombie" />
                <span>Zombie</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-process-orphan" />
                <span>Orphan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-muted" />
                <span>Terminated</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm border border-dashed border-border" />
                <span>Inactive</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GanttChart;
