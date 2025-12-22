import { useState, useCallback } from 'react';

// Simulated process with program counter
export interface SimProcess {
  pid: number;
  ppid: number;
  state: 'running' | 'waiting' | 'zombie' | 'orphan' | 'terminated';
  pc: number; // program counter - index into statements
  children: SimProcess[];
  depth: number;
}

// Parsed statement from code
export interface Statement {
  type: 'fork' | 'wait' | 'exit' | 'sleep' | 'other' | 'start';
  lineNumber: number;
  code: string;
  osExplanation: string;
}

let pidCounter = 1000;
const generatePid = () => ++pidCounter;

export const useCodeSimulator = () => {
  const [processes, setProcesses] = useState<SimProcess[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [stepCount, setStepCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Parse code into statements (only OS-relevant calls)
  const parseStatements = useCallback((code: string): Statement[] => {
    const lines = code.split('\n');
    const result: Statement[] = [];
    
    // Add implicit start
    result.push({
      type: 'start',
      lineNumber: 1,
      code: 'main()',
      osExplanation: 'Program starts with one process (PID 1001)'
    });

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const lineNum = index + 1;

      if (trimmed.includes('fork()')) {
        result.push({
          type: 'fork',
          lineNumber: lineNum,
          code: trimmed,
          osExplanation: 'fork() duplicates calling process. Returns: 0 to child, child_pid to parent. Both continue execution.'
        });
      } else if (trimmed.includes('wait(') || trimmed.includes('waitpid(')) {
        result.push({
          type: 'wait',
          lineNumber: lineNum,
          code: trimmed,
          osExplanation: 'wait() blocks until a child exits. Reaps zombie children. Without wait(), exited children become zombies.'
        });
      } else if (trimmed.match(/exit\s*\(/)) {
        result.push({
          type: 'exit',
          lineNumber: lineNum,
          code: trimmed,
          osExplanation: 'exit() terminates calling process. If parent not waiting → becomes zombie. If parent already exited → process is orphan.'
        });
      } else if (trimmed.includes('sleep(')) {
        result.push({
          type: 'sleep',
          lineNumber: lineNum,
          code: trimmed,
          osExplanation: 'sleep() pauses execution. Process remains running.'
        });
      }
    });

    return result;
  }, []);

  // Initialize simulation
  const initializeSimulation = useCallback((code: string) => {
    pidCounter = 1000;
    const parsed = parseStatements(code);
    setStatements(parsed);
    setStepCount(0);
    setIsComplete(false);
    setLogs(['[INIT] Program started']);

    // Create root process at PC=0 (start statement)
    const root: SimProcess = {
      pid: ++pidCounter, // 1001
      ppid: 1,
      state: 'running',
      pc: 0,
      children: [],
      depth: 0
    };

    setProcesses([root]);
    setLogs(['[EXEC] Created root process PID 1001']);
    
    return parsed;
  }, [parseStatements]);

  // Deep clone process tree
  const cloneTree = (procs: SimProcess[]): SimProcess[] => {
    return procs.map(p => ({
      ...p,
      children: cloneTree(p.children)
    }));
  };

  // Find process by PID in tree
  const findProcess = (procs: SimProcess[], pid: number): SimProcess | null => {
    for (const p of procs) {
      if (p.pid === pid) return p;
      const found = findProcess(p.children, pid);
      if (found) return found;
    }
    return null;
  };

  // Get all processes in tree (flattened)
  const getAllProcesses = (procs: SimProcess[]): SimProcess[] => {
    let result: SimProcess[] = [];
    for (const p of procs) {
      result.push(p);
      result = result.concat(getAllProcesses(p.children));
    }
    return result;
  };

  // Execute one simulation step
  const executeStep = useCallback(() => {
    if (statements.length === 0) return null;

    setProcesses(prev => {
      const tree = cloneTree(prev);
      const all = getAllProcesses(tree);
      
      // Find next running process to execute (round-robin simulation)
      const running = all.filter(p => p.state === 'running' && p.pc < statements.length);
      
      if (running.length === 0) {
        // Check if any processes are waiting
        const waiting = all.filter(p => p.state === 'waiting');
        if (waiting.length === 0) {
          setIsComplete(true);
          setLogs(l => [...l, '[DONE] All processes completed']);
          return tree;
        }
        
        // Check if waiting processes have zombie children to reap
        for (const waiter of waiting) {
          const zombie = waiter.children.find(c => c.state === 'zombie');
          if (zombie) {
            zombie.state = 'terminated';
            waiter.state = 'running';
            setLogs(l => [...l, `[REAP] PID ${waiter.pid} reaped zombie PID ${zombie.pid}`]);
            return tree;
          }
        }
        
        setIsComplete(true);
        return tree;
      }

      // Pick first running process (simulates scheduler)
      const proc = running[0];
      const stmt = statements[proc.pc];
      
      if (!stmt) {
        proc.pc++;
        return tree;
      }

      const newLogs: string[] = [];
      newLogs.push(`[EXEC] PID ${proc.pid} executing ${stmt.type}() at line ${stmt.lineNumber}`);

      switch (stmt.type) {
        case 'start':
          proc.pc++;
          break;

        case 'fork': {
          // Create exactly one child
          const childPid = generatePid();
          const child: SimProcess = {
            pid: childPid,
            ppid: proc.pid,
            state: 'running',
            pc: proc.pc + 1, // Child continues from next statement
            children: [],
            depth: proc.depth + 1
          };
          proc.children.push(child);
          proc.pc++; // Parent also continues
          
          newLogs.push(`[FORK] PID ${proc.pid} created child PID ${childPid}`);
          newLogs.push(`[INFO] Both processes continue execution independently`);
          break;
        }

        case 'wait': {
          // Check for zombie children first
          const zombie = proc.children.find(c => c.state === 'zombie');
          if (zombie) {
            zombie.state = 'terminated';
            proc.pc++;
            newLogs.push(`[WAIT] PID ${proc.pid} reaped zombie child PID ${zombie.pid}`);
            newLogs.push(`[STATE] PID ${zombie.pid} removed from process table`);
          } else {
            // Check for running children
            const runningChild = proc.children.find(c => c.state === 'running');
            if (runningChild) {
              proc.state = 'waiting';
              newLogs.push(`[WAIT] PID ${proc.pid} blocking until child exits`);
            } else {
              // No children to wait for
              proc.pc++;
              newLogs.push(`[WAIT] PID ${proc.pid} - no children to wait for`);
            }
          }
          break;
        }

        case 'exit': {
          // Find parent in tree
          const parent = findProcess(tree, proc.ppid);
          
          if (!parent || parent.state === 'terminated') {
            // Parent already exited - become orphan (adopted by init)
            proc.state = 'orphan';
            proc.ppid = 1;
            newLogs.push(`[EXIT] PID ${proc.pid} exiting`);
            newLogs.push(`[STATE] PID ${proc.pid} became ORPHAN (adopted by init PID 1)`);
          } else if (parent.state === 'waiting') {
            // Parent is waiting - clean exit
            proc.state = 'terminated';
            parent.state = 'running';
            parent.pc++;
            newLogs.push(`[EXIT] PID ${proc.pid} terminated cleanly`);
            newLogs.push(`[STATE] Parent PID ${parent.pid} resumed after wait()`);
          } else {
            // Parent running but not waiting - become zombie
            proc.state = 'zombie';
            newLogs.push(`[EXIT] PID ${proc.pid} exiting`);
            newLogs.push(`[STATE] PID ${proc.pid} became ZOMBIE (parent not waiting)`);
            newLogs.push(`[WARN] 💀 Zombie: Exit status not collected`);
          }

          // If this process has running children, they become orphans
          for (const child of proc.children) {
            if (child.state === 'running') {
              child.state = 'orphan';
              child.ppid = 1;
              newLogs.push(`[STATE] PID ${child.pid} became ORPHAN (parent exited)`);
            }
          }
          break;
        }

        case 'sleep':
          proc.pc++;
          newLogs.push(`[SLEEP] PID ${proc.pid} sleeping...`);
          break;

        default:
          proc.pc++;
      }

      setLogs(l => [...l, ...newLogs]);
      setStepCount(s => s + 1);
      
      // Check if simulation is complete
      const allAfter = getAllProcesses(tree);
      const stillRunning = allAfter.filter(p => 
        (p.state === 'running' && p.pc < statements.length) || 
        p.state === 'waiting'
      );
      
      if (stillRunning.length === 0) {
        const zombies = allAfter.filter(p => p.state === 'zombie');
        const orphans = allAfter.filter(p => p.state === 'orphan');
        
        if (zombies.length > 0) {
          setLogs(l => [...l, `[WARN] ${zombies.length} zombie process(es) remain!`]);
        }
        if (orphans.length > 0) {
          setLogs(l => [...l, `[INFO] ${orphans.length} orphan process(es) adopted by init`]);
        }
        
        setIsComplete(true);
        setLogs(l => [...l, '[DONE] Simulation complete']);
      }

      return tree;
    });

    return statements[stepCount] || null;
  }, [statements, stepCount]);

  // Reset simulation
  const reset = useCallback(() => {
    pidCounter = 1000;
    setProcesses([]);
    setStatements([]);
    setLogs([]);
    setStepCount(0);
    setIsComplete(false);
  }, []);

  // Get current statement being executed
  const getCurrentStatement = useCallback((): Statement | null => {
    if (processes.length === 0) return null;
    
    const all = getAllProcesses(processes);
    const running = all.filter(p => p.state === 'running' && p.pc < statements.length);
    
    if (running.length === 0) return null;
    return statements[running[0].pc] || null;
  }, [processes, statements]);

  // Get process count by state
  const getProcessStats = useCallback(() => {
    const all = getAllProcesses(processes);
    return {
      total: all.length,
      running: all.filter(p => p.state === 'running').length,
      waiting: all.filter(p => p.state === 'waiting').length,
      zombie: all.filter(p => p.state === 'zombie').length,
      orphan: all.filter(p => p.state === 'orphan').length,
      terminated: all.filter(p => p.state === 'terminated').length
    };
  }, [processes]);

  return {
    processes,
    statements,
    logs,
    stepCount,
    isComplete,
    initializeSimulation,
    executeStep,
    reset,
    getCurrentStatement,
    getProcessStats
  };
};
