import { useState, useCallback } from 'react';

export interface ParsedProcess {
  id: string;
  pid: number;
  ppid: number;
  state: 'running' | 'waiting' | 'zombie' | 'orphan' | 'terminated';
  children: ParsedProcess[];
  depth: number;
  forkLevel: number;
}

export interface ExecutionStep {
  lineNumber: number;
  code: string;
  action: 'fork' | 'wait' | 'exit' | 'sleep' | 'print' | 'parent_exit' | 'start' | 'end' | 'info';
  description: string;
  osExplanation: string;
}

let pidCounter = 1000;

const generatePid = () => ++pidCounter;

export const useCodeParser = () => {
  const [processes, setProcesses] = useState<ParsedProcess[]>([]);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [logs, setLogs] = useState<string[]>([]);
  const [forkLevel, setForkLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const parseCode = useCallback((code: string): ExecutionStep[] => {
    const lines = code.split('\n');
    const steps: ExecutionStep[] = [];
    
    // Count fork() calls to understand exponential growth
    let forkCalls = 0;
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const lineNum = index + 1;
      
      if (trimmed.includes('fork()')) {
        forkCalls++;
        steps.push({
          lineNumber: lineNum,
          code: trimmed,
          action: 'fork',
          description: `fork() #${forkCalls}: Each running process creates one child`,
          osExplanation: `fork() duplicates ALL ${Math.pow(2, forkCalls - 1)} running processes. After this: ${Math.pow(2, forkCalls)} total processes. Returns: 0 to child, child_pid to parent.`
        });
      } else if (trimmed.includes('wait(') || trimmed.includes('waitpid(')) {
        steps.push({
          lineNumber: lineNum,
          code: trimmed,
          action: 'wait',
          description: 'Parent waits for any child to terminate',
          osExplanation: 'wait() blocks parent until a child exits. Reaps zombie processes. Without wait(), terminated children become zombies.'
        });
      } else if (trimmed.match(/exit\s*\(\s*0\s*\)/)) {
        // Check context - is this in child or parent branch?
        const prevLines = lines.slice(0, index).join('\n');
        const isChildExit = prevLines.includes('pid == 0') || prevLines.includes('pid==0');
        
        steps.push({
          lineNumber: lineNum,
          code: trimmed,
          action: 'exit',
          description: isChildExit ? 'Child process exits' : 'Process exits',
          osExplanation: isChildExit 
            ? 'Child calls exit(). If parent hasn\'t called wait(), child becomes ZOMBIE.'
            : 'Process terminates. Running children become ORPHANS (adopted by init PID 1).'
        });
      } else if (trimmed.includes('printf') || trimmed.includes('print')) {
        steps.push({
          lineNumber: lineNum,
          code: trimmed,
          action: 'print',
          description: 'Output to console',
          osExplanation: 'All processes (parent and children) may execute this line. Order is non-deterministic.'
        });
      } else if (trimmed.includes('int main()') || trimmed.includes('main()')) {
        steps.push({
          lineNumber: lineNum,
          code: trimmed,
          action: 'start',
          description: 'Program starts with one process',
          osExplanation: 'Initial process begins execution. This is like init spawning a new process.'
        });
      }
    });
    
    return steps;
  }, []);

  const initializeExecution = useCallback((code: string) => {
    pidCounter = 1000;
    setForkLevel(0);
    setError(null);
    
    const steps = parseCode(code);
    
    if (steps.length === 0) {
      setError('No executable statements found. Use fork(), wait(), or exit().');
      return steps;
    }
    
    setExecutionSteps(steps);
    setCurrentStepIndex(-1);
    setLogs([]);
    
    // Initialize with root process
    const rootProcess: ParsedProcess = {
      id: 'process-1001',
      pid: 1001,
      ppid: 1,
      state: 'running',
      children: [],
      depth: 0,
      forkLevel: 0
    };
    setProcesses([rootProcess]);
    setLogs(['$ Program started with PID 1001']);
    
    return steps;
  }, [parseCode]);

  // Collect all running processes recursively
  const collectRunning = (procs: ParsedProcess[]): ParsedProcess[] => {
    let result: ParsedProcess[] = [];
    for (const p of procs) {
      if (p.state === 'running') {
        result.push(p);
      }
      result = result.concat(collectRunning(p.children));
    }
    return result;
  };

  const executeStep = useCallback(() => {
    if (currentStepIndex >= executionSteps.length - 1) return null;
    
    const nextIndex = currentStepIndex + 1;
    const step = executionSteps[nextIndex];
    
    setCurrentStepIndex(nextIndex);
    
    setProcesses(prev => {
      // Deep clone
      const cloneProcess = (p: ParsedProcess): ParsedProcess => ({
        ...p,
        children: p.children.map(cloneProcess)
      });
      const newProcesses = prev.map(cloneProcess);
      
      if (step.action === 'fork') {
        // CORRECT FORK: Duplicate ALL running processes
        const running = collectRunning(newProcesses);
        const newLevel = forkLevel + 1;
        setForkLevel(newLevel);
        
        const addChildToParent = (procs: ParsedProcess[], parentPid: number, child: ParsedProcess): boolean => {
          for (const p of procs) {
            if (p.pid === parentPid) {
              p.children.push(child);
              return true;
            }
            if (addChildToParent(p.children, parentPid, child)) return true;
          }
          return false;
        };
        
        const newPids: number[] = [];
        for (const parent of running) {
          const childPid = generatePid();
          newPids.push(childPid);
          const child: ParsedProcess = {
            id: `process-${childPid}`,
            pid: childPid,
            ppid: parent.pid,
            state: 'running',
            children: [],
            depth: parent.depth + 1,
            forkLevel: newLevel
          };
          addChildToParent(newProcesses, parent.pid, child);
        }
        
        setLogs(l => [
          ...l, 
          `$ fork() → ${running.length} processes each created 1 child`,
          `$ New PIDs: ${newPids.join(', ')}`,
          `$ Total running: ${running.length + newPids.length} (2^${newLevel} = ${Math.pow(2, newLevel)})`,
          `$ ⚠️ Execution order is scheduler-dependent`
        ]);
        
      } else if (step.action === 'wait') {
        // Find a parent with children
        const findParentWithChildren = (procs: ParsedProcess[]): ParsedProcess | null => {
          for (const p of procs) {
            if (p.state === 'running' && p.children.length > 0) {
              // Check for zombie children first
              const zombie = p.children.find(c => c.state === 'zombie');
              if (zombie) return p;
              // Then running children
              const running = p.children.find(c => c.state === 'running');
              if (running) return p;
            }
            const found = findParentWithChildren(p.children);
            if (found) return found;
          }
          return null;
        };
        
        const parent = findParentWithChildren(newProcesses);
        if (parent) {
          const zombie = parent.children.find(c => c.state === 'zombie');
          if (zombie) {
            zombie.state = 'terminated';
            setLogs(l => [...l, `$ wait() by PID ${parent.pid} → Reaped zombie PID ${zombie.pid}`]);
          } else {
            parent.state = 'waiting';
            setLogs(l => [...l, `$ wait() by PID ${parent.pid} → Blocking until child exits`]);
          }
        }
        
      } else if (step.action === 'exit') {
        // Find a leaf process to exit
        const findExitCandidate = (procs: ParsedProcess[]): { proc: ParsedProcess, parent: ParsedProcess | null } | null => {
          for (const p of procs) {
            // Check children first (DFS)
            for (const child of p.children) {
              if (child.state === 'running' && child.children.filter(c => c.state === 'running').length === 0) {
                return { proc: child, parent: p };
              }
              const found = findExitCandidate([child]);
              if (found) return found;
            }
          }
          return null;
        };
        
        const candidate = findExitCandidate(newProcesses);
        if (candidate) {
          const { proc, parent } = candidate;
          
          if (parent?.state === 'waiting') {
            proc.state = 'terminated';
            parent.state = 'running';
            setLogs(l => [...l, `$ exit(0) by PID ${proc.pid} → Terminated (parent was waiting)`]);
          } else {
            proc.state = 'zombie';
            setLogs(l => [
              ...l, 
              `$ exit(0) by PID ${proc.pid} → Became ZOMBIE`,
              `$ 💀 Zombie: Exit status not collected by parent`
            ]);
          }
        }
        
      } else if (step.action === 'parent_exit') {
        // Parent exits, orphaning children
        const root = newProcesses[0];
        if (root && root.children.length > 0) {
          root.state = 'terminated';
          root.children.forEach(child => {
            if (child.state === 'running') {
              child.state = 'orphan';
              child.ppid = 1;
            }
          });
          setLogs(l => [
            ...l, 
            `$ Parent PID ${root.pid} exited`,
            `$ Children become ORPHAN → Adopted by init (PID 1)`
          ]);
        }
      }
      
      return newProcesses;
    });
    
    return step;
  }, [currentStepIndex, executionSteps, forkLevel]);

  const reset = useCallback(() => {
    pidCounter = 1000;
    setProcesses([]);
    setExecutionSteps([]);
    setCurrentStepIndex(-1);
    setLogs([]);
    setForkLevel(0);
    setError(null);
  }, []);

  const getCurrentStep = useCallback(() => {
    if (currentStepIndex < 0 || currentStepIndex >= executionSteps.length) {
      return null;
    }
    return executionSteps[currentStepIndex];
  }, [currentStepIndex, executionSteps]);

  return {
    processes,
    executionSteps,
    currentStepIndex,
    logs,
    error,
    forkLevel,
    parseCode,
    initializeExecution,
    executeStep,
    reset,
    getCurrentStep,
    isComplete: currentStepIndex >= executionSteps.length - 1 && executionSteps.length > 0
  };
};
