import { useState, useCallback } from 'react';

// Simulated process with program counter
export interface SimProcess {
  pid: number;
  ppid: number;
  state: 'running' | 'waiting' | 'zombie' | 'orphan' | 'terminated';
  pc: number; // program counter - index into statements
  children: SimProcess[];
  depth: number;
  hasExited: boolean; // Track if this specific process has executed exit()
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

      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        return;
      }

      if (trimmed.includes('fork()')) {
        result.push({
          type: 'fork',
          lineNumber: lineNum,
          code: trimmed,
          osExplanation: 'fork() duplicates calling process. Returns: 0 to child, child_pid to parent. Both continue execution from next statement.'
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
          osExplanation: 'exit() terminates ONLY the calling process. If parent alive but not waiting → zombie. If parent already exited → orphan.'
        });
      } else if (trimmed.includes('sleep(')) {
        result.push({
          type: 'sleep',
          lineNumber: lineNum,
          code: trimmed,
          osExplanation: 'sleep() pauses execution temporarily. Process remains in running state.'
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
      depth: 0,
      hasExited: false
    };

    setProcesses([root]);
    setLogs(['[EXEC] Created root process PID 1001 (parent: init PID 1)']);
    
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
      // Only processes that haven't exited and have statements to execute
      const running = all.filter(p => 
        p.state === 'running' && 
        !p.hasExited && 
        p.pc < statements.length
      );
      
      if (running.length === 0) {
        // Check if any processes are waiting
        const waiting = all.filter(p => p.state === 'waiting');
        if (waiting.length > 0) {
          // Check if waiting processes have zombie children to reap
          for (const waiter of waiting) {
            const zombie = waiter.children.find(c => c.state === 'zombie');
            if (zombie) {
              zombie.state = 'terminated';
              waiter.state = 'running';
              waiter.pc++;
              setLogs(l => [...l, `[REAP] PID ${waiter.pid} reaped zombie PID ${zombie.pid}`]);
              setStepCount(s => s + 1);
              return tree;
            }
          }
        }
        
        // No more work to do
        const zombies = all.filter(p => p.state === 'zombie');
        const orphans = all.filter(p => p.state === 'orphan');
        const stillRunning = all.filter(p => p.state === 'running' && !p.hasExited);
        
        if (!isComplete) {
          const summaryLogs: string[] = [];
          if (zombies.length > 0) {
            summaryLogs.push(`[WARN] 💀 ${zombies.length} zombie process(es) remain - parent never called wait()`);
          }
          if (orphans.length > 0) {
            summaryLogs.push(`[INFO] 👤 ${orphans.length} orphan process(es) adopted by init (still running)`);
          }
          if (stillRunning.length > 0) {
            summaryLogs.push(`[INFO] ✓ ${stillRunning.length} process(es) still running normally`);
          }
          summaryLogs.push('[DONE] Simulation complete');
          setLogs(l => [...l, ...summaryLogs]);
          setIsComplete(true);
        }
        
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
          // Create exactly one child from THIS process only
          const childPid = generatePid();
          const child: SimProcess = {
            pid: childPid,
            ppid: proc.pid,
            state: 'running',
            pc: proc.pc + 1, // Child continues from next statement
            children: [],
            depth: proc.depth + 1,
            hasExited: false
          };
          proc.children.push(child);
          proc.pc++; // Parent also continues
          
          newLogs.push(`[FORK] PID ${proc.pid} created child PID ${childPid}`);
          newLogs.push(`[INFO] Parent returns ${childPid}, child returns 0`);
          newLogs.push(`[INFO] Both processes continue independently`);
          break;
        }

        case 'wait': {
          // Check for zombie children first - reap them
          const zombie = proc.children.find(c => c.state === 'zombie');
          if (zombie) {
            zombie.state = 'terminated';
            proc.pc++;
            newLogs.push(`[WAIT] PID ${proc.pid} reaped zombie child PID ${zombie.pid}`);
            newLogs.push(`[STATE] PID ${zombie.pid} removed from process table`);
          } else {
            // Check for running children (not yet exited)
            const activeChild = proc.children.find(c => 
              c.state === 'running' && !c.hasExited
            );
            if (activeChild) {
              proc.state = 'waiting';
              newLogs.push(`[WAIT] PID ${proc.pid} blocking until child exits`);
            } else {
              // No children to wait for (either no children or all already handled)
              proc.pc++;
              newLogs.push(`[WAIT] PID ${proc.pid} - no children to wait for, continuing`);
            }
          }
          break;
        }

        case 'exit': {
          // Mark this specific process as having executed exit()
          proc.hasExited = true;
          
          // Find parent in tree
          const parent = findProcess(tree, proc.ppid);
          
          if (!parent || parent.hasExited || parent.state === 'terminated') {
            // Parent already exited - this process becomes orphan
            proc.state = 'orphan';
            proc.ppid = 1;
            newLogs.push(`[EXIT] PID ${proc.pid} calling exit()`);
            newLogs.push(`[STATE] PID ${proc.pid} became ORPHAN (parent already exited)`);
            newLogs.push(`[INFO] 👤 Adopted by init (PID 1) - still running`);
          } else if (parent.state === 'waiting') {
            // Parent is waiting - clean exit, wake parent
            proc.state = 'terminated';
            parent.state = 'running';
            parent.pc++;
            newLogs.push(`[EXIT] PID ${proc.pid} terminated cleanly`);
            newLogs.push(`[STATE] Parent PID ${parent.pid} resumed after wait()`);
          } else {
            // Parent is running but not waiting - become zombie
            proc.state = 'zombie';
            newLogs.push(`[EXIT] PID ${proc.pid} calling exit()`);
            newLogs.push(`[STATE] PID ${proc.pid} became ZOMBIE`);
            newLogs.push(`[WARN] 💀 Parent PID ${parent.pid} not waiting - exit status not collected`);
          }

          // If this process has running children, they become orphans
          for (const child of proc.children) {
            if (child.state === 'running' && !child.hasExited) {
              child.state = 'orphan';
              child.ppid = 1;
              newLogs.push(`[STATE] PID ${child.pid} became ORPHAN (parent exited)`);
              newLogs.push(`[INFO] 👤 Adopted by init (PID 1)`);
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
      const stillActive = allAfter.filter(p => 
        (p.state === 'running' && !p.hasExited && p.pc < statements.length) || 
        p.state === 'waiting'
      );
      
      if (stillActive.length === 0 && !isComplete) {
        const zombies = allAfter.filter(p => p.state === 'zombie');
        const orphans = allAfter.filter(p => p.state === 'orphan');
        const runningNormal = allAfter.filter(p => p.state === 'running' && !p.hasExited);
        
        const summaryLogs: string[] = [];
        if (zombies.length > 0) {
          summaryLogs.push(`[WARN] 💀 ${zombies.length} zombie process(es) remain - parent never called wait()`);
        }
        if (orphans.length > 0) {
          summaryLogs.push(`[INFO] 👤 ${orphans.length} orphan process(es) adopted by init (still running)`);
        }
        if (runningNormal.length > 0 && zombies.length === 0 && orphans.length === 0) {
          summaryLogs.push(`[INFO] ✓ All ${runningNormal.length} process(es) completed normally`);
        }
        
        summaryLogs.push('[DONE] Simulation complete');
        setLogs(l => [...l, ...summaryLogs]);
        setIsComplete(true);
      }

      return tree;
    });

    return statements[stepCount] || null;
  }, [statements, stepCount, isComplete]);

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
    const running = all.filter(p => 
      p.state === 'running' && 
      !p.hasExited && 
      p.pc < statements.length
    );
    
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
