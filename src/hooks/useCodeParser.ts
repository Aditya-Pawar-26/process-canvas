import { useState, useCallback } from 'react';

export interface ParsedProcess {
  id: string;
  pid: number;
  ppid: number;
  state: 'running' | 'waiting' | 'zombie' | 'orphan' | 'terminated';
  children: ParsedProcess[];
  depth: number;
}

export interface ExecutionStep {
  lineNumber: number;
  code: string;
  action: 'fork' | 'wait' | 'exit' | 'sleep' | 'print' | 'if' | 'else' | 'start' | 'end';
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

  const parseCode = useCallback((code: string): ExecutionStep[] => {
    const lines = code.split('\n');
    const steps: ExecutionStep[] = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const lineNum = index + 1;
      
      if (trimmed.includes('fork()')) {
        steps.push({
          lineNumber: lineNum,
          code: trimmed,
          action: 'fork',
          description: 'Creating child process via fork()',
          osExplanation: 'fork() duplicates the current process. Returns 0 to child, child PID to parent.'
        });
      } else if (trimmed.includes('wait(') || trimmed.includes('waitpid(')) {
        steps.push({
          lineNumber: lineNum,
          code: trimmed,
          action: 'wait',
          description: 'Parent waiting for child',
          osExplanation: 'wait() suspends parent until a child terminates and returns its exit status.'
        });
      } else if (trimmed.includes('exit(')) {
        steps.push({
          lineNumber: lineNum,
          code: trimmed,
          action: 'exit',
          description: 'Process terminating',
          osExplanation: 'exit() terminates the process. If parent hasn\'t called wait(), child becomes zombie.'
        });
      } else if (trimmed.includes('sleep(')) {
        steps.push({
          lineNumber: lineNum,
          code: trimmed,
          action: 'sleep',
          description: 'Process sleeping',
          osExplanation: 'sleep() suspends execution for specified seconds.'
        });
      } else if (trimmed.includes('printf') || trimmed.includes('print')) {
        steps.push({
          lineNumber: lineNum,
          code: trimmed,
          action: 'print',
          description: 'Output to console',
          osExplanation: 'Standard output from process.'
        });
      } else if (trimmed.startsWith('if') && trimmed.includes('pid')) {
        steps.push({
          lineNumber: lineNum,
          code: trimmed,
          action: 'if',
          description: 'Checking process context',
          osExplanation: 'After fork(), checking if we\'re in child (pid==0) or parent (pid>0).'
        });
      } else if (trimmed === '} else {' || trimmed.startsWith('} else')) {
        steps.push({
          lineNumber: lineNum,
          code: trimmed,
          action: 'else',
          description: 'Switching to other branch',
          osExplanation: 'Entering the other branch of the fork condition.'
        });
      } else if (trimmed.includes('int main()') || trimmed.includes('main()')) {
        steps.push({
          lineNumber: lineNum,
          code: trimmed,
          action: 'start',
          description: 'Program starts',
          osExplanation: 'Initial process (like init) begins execution.'
        });
      } else if (trimmed === 'return 0;' || trimmed === '}' && lines.slice(index + 1).every(l => l.trim() === '')) {
        steps.push({
          lineNumber: lineNum,
          code: trimmed,
          action: 'end',
          description: 'Process ends',
          osExplanation: 'Process completes and resources are released.'
        });
      }
    });
    
    return steps;
  }, []);

  const initializeExecution = useCallback((code: string) => {
    pidCounter = 1000;
    const steps = parseCode(code);
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
      depth: 0
    };
    setProcesses([rootProcess]);
    
    return steps;
  }, [parseCode]);

  const executeStep = useCallback(() => {
    if (currentStepIndex >= executionSteps.length - 1) return null;
    
    const nextIndex = currentStepIndex + 1;
    const step = executionSteps[nextIndex];
    
    setCurrentStepIndex(nextIndex);
    
    setProcesses(prev => {
      const newProcesses = JSON.parse(JSON.stringify(prev)) as ParsedProcess[];
      
      if (step.action === 'fork') {
        // Find running process to fork from
        const findRunning = (procs: ParsedProcess[]): ParsedProcess | null => {
          for (const p of procs) {
            if (p.state === 'running') return p;
            const found = findRunning(p.children);
            if (found) return found;
          }
          return null;
        };
        
        const parent = findRunning(newProcesses);
        if (parent) {
          const childPid = generatePid();
          const child: ParsedProcess = {
            id: `process-${childPid}`,
            pid: childPid,
            ppid: parent.pid,
            state: 'running',
            children: [],
            depth: parent.depth + 1
          };
          parent.children.push(child);
          setLogs(l => [...l, `fork() → Child PID ${childPid} created`]);
        }
      } else if (step.action === 'wait') {
        // Find running process with children
        const findWithChildren = (procs: ParsedProcess[]): ParsedProcess | null => {
          for (const p of procs) {
            if (p.state === 'running' && p.children.length > 0) return p;
            const found = findWithChildren(p.children);
            if (found) return found;
          }
          return null;
        };
        
        const parent = findWithChildren(newProcesses);
        if (parent) {
          parent.state = 'waiting';
          setLogs(l => [...l, `wait() → PID ${parent.pid} waiting for children`]);
        }
      } else if (step.action === 'exit') {
        // Find a child process that's running
        const findChild = (procs: ParsedProcess[]): ParsedProcess | null => {
          for (const p of procs) {
            for (const child of p.children) {
              if (child.state === 'running' && child.children.length === 0) {
                return child;
              }
            }
            const found = findChild(p.children);
            if (found) return found;
          }
          return null;
        };
        
        // Also find parent that might be waiting
        const findParent = (procs: ParsedProcess[], ppid: number): ParsedProcess | null => {
          for (const p of procs) {
            if (p.pid === ppid) return p;
            const found = findParent(p.children, ppid);
            if (found) return found;
          }
          return null;
        };
        
        const child = findChild(newProcesses);
        if (child) {
          const parent = findParent(newProcesses, child.ppid);
          if (parent?.state === 'waiting') {
            child.state = 'terminated';
            parent.state = 'running';
            setLogs(l => [...l, `exit() → PID ${child.pid} terminated normally`]);
          } else {
            child.state = 'zombie';
            setLogs(l => [...l, `exit() → PID ${child.pid} became ZOMBIE`]);
          }
        }
      }
      
      return newProcesses;
    });
    
    return step;
  }, [currentStepIndex, executionSteps]);

  const reset = useCallback(() => {
    pidCounter = 1000;
    setProcesses([]);
    setExecutionSteps([]);
    setCurrentStepIndex(-1);
    setLogs([]);
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
    parseCode,
    initializeExecution,
    executeStep,
    reset,
    getCurrentStep,
    isComplete: currentStepIndex >= executionSteps.length - 1 && executionSteps.length > 0
  };
};
