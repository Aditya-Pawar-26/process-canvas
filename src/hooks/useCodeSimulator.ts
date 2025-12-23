import { useState, useCallback } from 'react';

// Simulated process with program counter
export interface SimProcess {
  pid: number;
  ppid: number;
  state: 'running' | 'waiting' | 'zombie' | 'orphan' | 'terminated';
  pc: number; // program counter - index into statements
  children: SimProcess[];
  depth: number;
  hasExited: boolean;
  isOriginalParent: boolean; // Track if this is the original parent (root)
  forkGeneration: number; // Track which fork created this process (0 = original)
}

// Parsed statement from code
export interface Statement {
  type: 'fork' | 'wait' | 'exit' | 'sleep' | 'other' | 'start';
  target: 'parent' | 'child' | 'any'; // Who should execute this
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

  // Parse code into statements with smart target detection
  const parseStatements = useCallback((code: string): Statement[] => {
    const lines = code.split('\n');
    const result: Statement[] = [];

    // Add implicit start
    result.push({
      type: 'start',
      target: 'any',
      lineNumber: 1,
      code: 'main()',
      osExplanation: 'Program starts with one process (PID 1001)',
    });

    // Detect target from inline comments
    const getTargetFromLine = (line: string): 'parent' | 'child' | 'any' => {
      const lower = line.toLowerCase();
      // Check for explicit hints in comments
      if (lower.includes('// child') || lower.includes('//child')) return 'child';
      if (lower.includes('// parent') || lower.includes('//parent')) return 'parent';
      return 'any';
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const lineNum = index + 1;

      // Skip comment-only lines
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        return;
      }

      if (trimmed.includes('fork()')) {
        result.push({
          type: 'fork',
          target: 'any', // fork is always executed by any running process
          lineNumber: lineNum,
          code: trimmed,
          osExplanation: 'fork() creates a new child process. Parent and child continue from here independently.',
        });
      } else if (trimmed.includes('wait(') || trimmed.includes('waitpid(')) {
        result.push({
          type: 'wait',
          target: getTargetFromLine(line),
          lineNumber: lineNum,
          code: trimmed,
          osExplanation: 'wait() blocks until a child exits, then reaps it (collects exit status).',
        });
      } else if (trimmed.match(/\bexit\s*\(/)) {
        result.push({
          type: 'exit',
          target: getTargetFromLine(line),
          lineNumber: lineNum,
          code: trimmed,
          osExplanation: 'exit() terminates the calling process. May create zombie or orphan depending on parent state.',
        });
      } else if (trimmed.includes('sleep(')) {
        result.push({
          type: 'sleep',
          target: getTargetFromLine(line),
          lineNumber: lineNum,
          code: trimmed,
          osExplanation: 'sleep() pauses execution. Process remains alive.',
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

    const root: SimProcess = {
      pid: ++pidCounter,
      ppid: 1,
      state: 'running',
      pc: 0,
      children: [],
      depth: 0,
      hasExited: false,
      isOriginalParent: true,
      forkGeneration: 0,
    };

    setProcesses([root]);
    setLogs(['[EXEC] Created root process PID 1001 (parent: init PID 1)']);
    
    return parsed;
  }, [parseStatements]);

  // Deep clone process tree
  const cloneTree = (procs: SimProcess[]): SimProcess[] => {
    return procs.map(p => ({
      ...p,
      children: cloneTree(p.children),
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

  // Check if process should execute statement based on target
  const shouldExecute = (proc: SimProcess, stmt: Statement): boolean => {
    if (stmt.target === 'any') return true;
    if (stmt.target === 'parent') return proc.isOriginalParent || proc.ppid === 1;
    if (stmt.target === 'child') return !proc.isOriginalParent && proc.ppid !== 1;
    return true;
  };

  // Execute one simulation step
  const executeStep = useCallback(() => {
    if (statements.length === 0) return null;

    setProcesses(prev => {
      const tree = cloneTree(prev);
      const all = getAllProcesses(tree);

      // Find processes that can run (running state, not exited, has statements left)
      const runnableSnapshot = all.filter(
        p => p.state === 'running' && !p.hasExited && p.pc < statements.length
      );

      // If no runnable processes, check for waiting processes with zombies to reap
      if (runnableSnapshot.length === 0) {
        const waiting = all.filter(p => p.state === 'waiting');
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

        // Simulation complete
        if (!isComplete) {
          const zombies = all.filter(p => p.state === 'zombie');
          const orphans = all.filter(p => p.state === 'orphan');
          const running = all.filter(p => p.state === 'running' && !p.hasExited);

          const summaryLogs: string[] = [];
          if (zombies.length > 0) {
            summaryLogs.push(`[WARN] 💀 ${zombies.length} zombie process(es) - parent never called wait()`);
          }
          if (orphans.length > 0) {
            summaryLogs.push(`[INFO] 👤 ${orphans.length} orphan process(es) adopted by init`);
          }
          if (running.length > 0 && zombies.length === 0 && orphans.length === 0) {
            summaryLogs.push(`[INFO] ✓ ${running.length} process(es) running normally`);
          }
          summaryLogs.push('[DONE] Simulation complete');
          setLogs(l => [...l, ...summaryLogs]);
          setIsComplete(true);
        }
        return tree;
      }

      const tickLogs: string[] = [];

      // Execute one instruction for each runnable process
      for (const procSnap of runnableSnapshot) {
        const proc = findProcess(tree, procSnap.pid);
        if (!proc || proc.state !== 'running' || proc.hasExited || proc.pc >= statements.length) continue;

        const stmt = statements[proc.pc];
        if (!stmt) {
          proc.pc++;
          continue;
        }

        // Check if this process should execute this statement
        if (!shouldExecute(proc, stmt)) {
          proc.pc++;
          continue;
        }

        tickLogs.push(`[EXEC] PID ${proc.pid} executing ${stmt.type}() at line ${stmt.lineNumber}`);

        switch (stmt.type) {
          case 'start':
            proc.pc++;
            break;

          case 'fork': {
            const childPid = generatePid();
            const child: SimProcess = {
              pid: childPid,
              ppid: proc.pid,
              state: 'running',
              pc: proc.pc + 1,
              children: [],
              depth: proc.depth + 1,
              hasExited: false,
              isOriginalParent: false,
              forkGeneration: proc.forkGeneration + 1,
            };
            proc.children.push(child);
            proc.pc++;
            tickLogs.push(`[FORK] PID ${proc.pid} created child PID ${childPid}`);
            break;
          }

          case 'wait': {
            const zombie = proc.children.find(c => c.state === 'zombie');
            if (zombie) {
              zombie.state = 'terminated';
              proc.pc++;
              tickLogs.push(`[REAP] PID ${proc.pid} reaped zombie PID ${zombie.pid}`);
            } else {
              const activeChild = proc.children.find(
                c => (c.state === 'running' || c.state === 'orphan') && !c.hasExited
              );
              if (activeChild) {
                proc.state = 'waiting';
                tickLogs.push(`[WAIT] PID ${proc.pid} blocking until child exits`);
              } else {
                proc.pc++;
                tickLogs.push(`[WAIT] PID ${proc.pid} no children to wait for`);
              }
            }
            break;
          }

          case 'exit': {
            proc.hasExited = true;

            // Orphan any running children
            const activeChildren = proc.children.filter(
              c => (c.state === 'running' || c.state === 'orphan') && !c.hasExited
            );
            for (const child of activeChildren) {
              child.state = 'orphan';
              child.ppid = 1;
              tickLogs.push(`[STATE] PID ${child.pid} became ORPHAN (parent ${proc.pid} exited)`);
            }

            const parent = findProcess(tree, proc.ppid);

            // If parent is waiting, reap immediately
            if (parent && parent.state === 'waiting') {
              proc.state = 'terminated';
              parent.state = 'running';
              parent.pc++;
              tickLogs.push(`[EXIT] PID ${proc.pid} terminated; parent resumed from wait()`);
              break;
            }

            // If parent is alive and not waiting => zombie
            if (parent && !parent.hasExited && parent.state !== 'terminated') {
              proc.state = 'zombie';
              tickLogs.push(`[EXIT] PID ${proc.pid} called exit()`);
              tickLogs.push(`[STATE] PID ${proc.pid} became ZOMBIE (parent not waiting)`);
              break;
            }

            // Parent is gone or is init => terminate cleanly
            proc.state = 'terminated';
            tickLogs.push(`[EXIT] PID ${proc.pid} terminated (reaped by init)`);
            break;
          }

          case 'sleep':
            proc.pc++;
            tickLogs.push(`[SLEEP] PID ${proc.pid} sleeping`);
            break;

          default:
            proc.pc++;
        }
      }

      setLogs(l => [...l, ...tickLogs]);
      setStepCount(s => s + 1);

      // Check for completion
      const allAfter = getAllProcesses(tree);
      const stillActive = allAfter.filter(
        p => (p.state === 'running' && !p.hasExited && p.pc < statements.length) || p.state === 'waiting'
      );

      if (stillActive.length === 0 && !isComplete) {
        const zombies = allAfter.filter(p => p.state === 'zombie');
        const orphans = allAfter.filter(p => p.state === 'orphan');
        const running = allAfter.filter(p => p.state === 'running' && !p.hasExited);

        const summaryLogs: string[] = [];
        if (zombies.length > 0) {
          summaryLogs.push(`[WARN] 💀 ${zombies.length} zombie process(es) - parent never called wait()`);
        }
        if (orphans.length > 0) {
          summaryLogs.push(`[INFO] 👤 ${orphans.length} orphan process(es) adopted by init`);
        }
        if (running.length > 0 && zombies.length === 0 && orphans.length === 0) {
          summaryLogs.push(`[INFO] ✓ All ${running.length} process(es) completed normally`);
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

  // Get current statement
  const getCurrentStatement = useCallback((): Statement | null => {
    if (processes.length === 0) return null;
    const all = getAllProcesses(processes);
    const running = all.filter(p => p.state === 'running' && !p.hasExited && p.pc < statements.length);
    if (running.length === 0) return null;
    return statements[running[0].pc] || null;
  }, [processes, statements]);

  // Get process stats
  const getProcessStats = useCallback(() => {
    const all = getAllProcesses(processes);
    return {
      total: all.length,
      running: all.filter(p => p.state === 'running').length,
      waiting: all.filter(p => p.state === 'waiting').length,
      zombie: all.filter(p => p.state === 'zombie').length,
      orphan: all.filter(p => p.state === 'orphan').length,
      terminated: all.filter(p => p.state === 'terminated').length,
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
    getProcessStats,
  };
};
