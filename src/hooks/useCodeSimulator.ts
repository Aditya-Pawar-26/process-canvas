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
  /** Optional execution hint used by presets (still one unified engine).
   *  - any: every running process executes it
   *  - parent: only the root/ppid=1 process executes it
   *  - child: only non-root processes execute it
   */
  target?: 'any' | 'parent' | 'child';
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
      osExplanation: 'Program starts with one process (PID 1001)',
    });

    const getTargetHint = (rawLine: string): Statement['target'] => {
      const lower = rawLine.toLowerCase();
      if (lower.includes('// parent')) return 'parent';
      if (lower.includes('// child')) return 'child';
      return 'any';
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const lineNum = index + 1;

      // Skip comments-only lines
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*')
      ) {
        return;
      }

      if (trimmed.includes('fork()')) {
        result.push({
          type: 'fork',
          target: getTargetHint(line),
          lineNumber: lineNum,
          code: trimmed,
          osExplanation:
            'fork() duplicates the calling process. Both parent and child continue from the next statement with independent program counters.',
        });
      } else if (trimmed.includes('wait(') || trimmed.includes('waitpid(')) {
        result.push({
          type: 'wait',
          target: getTargetHint(line),
          lineNumber: lineNum,
          code: trimmed,
          osExplanation:
            'wait() blocks the calling process until a child exits, then reaps the zombie (collects exit status).',
        });
      } else if (trimmed.match(/\bexit\s*\(/)) {
        result.push({
          type: 'exit',
          target: getTargetHint(line),
          lineNumber: lineNum,
          code: trimmed,
          osExplanation:
            'exit() terminates ONLY the calling process. If its parent is alive but not waiting → zombie. Orphans are created when a parent exits while children are still running.',
        });
      } else if (trimmed.includes('sleep(')) {
        result.push({
          type: 'sleep',
          target: getTargetHint(line),
          lineNumber: lineNum,
          code: trimmed,
          osExplanation: 'sleep() advances time; the process remains runnable in this simulator.',
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

  // Execute one simulation step (one scheduler "tick")
  // In each tick, EVERY runnable process executes exactly one instruction at its own PC.
  const executeStep = useCallback(() => {
    if (statements.length === 0) return null;

    const shouldExecuteForProcess = (proc: SimProcess, stmt: Statement): boolean => {
      const target = stmt.target ?? 'any';
      if (target === 'any') return true;
      if (target === 'parent') return proc.ppid === 1; // root-ish
      if (target === 'child') return proc.ppid !== 1;
      return true;
    };

    setProcesses(prev => {
      const tree = cloneTree(prev);
      const all = getAllProcesses(tree);

      const runnableSnapshot = all.filter(
        p => p.state === 'running' && !p.hasExited && p.pc < statements.length
      );

      // If nobody can run, try to resolve waiters (reap zombies), then finish.
      if (runnableSnapshot.length === 0) {
        const waiting = all.filter(p => p.state === 'waiting');
        for (const waiter of waiting) {
          const zombie = waiter.children.find(c => c.state === 'zombie');
          if (zombie) {
            zombie.state = 'terminated';
            waiter.state = 'running';
            waiter.pc++; // wait() returns
            setLogs(l => [...l, `[REAP] PID ${waiter.pid} reaped zombie PID ${zombie.pid}`]);
            setStepCount(s => s + 1);
            return tree;
          }
        }

        if (!isComplete) {
          const zombies = all.filter(p => p.state === 'zombie');
          const orphans = all.filter(p => p.state === 'orphan');
          const stillRunning = all.filter(p => p.state === 'running' && !p.hasExited);

          const summaryLogs: string[] = [];
          if (zombies.length > 0) {
            summaryLogs.push(
              `[WARN] 💀 ${zombies.length} zombie process(es) remain - parent never called wait()`
            );
          }
          if (orphans.length > 0) {
            summaryLogs.push(
              `[INFO] 👤 ${orphans.length} orphan process(es) adopted by init (PID 1)`
            );
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

      const tickLogs: string[] = [];

      // Execute one instruction for each runnable process (snapshot).
      for (const procSnap of runnableSnapshot) {
        const proc = findProcess(tree, procSnap.pid);
        if (!proc) continue;
        if (proc.state !== 'running' || proc.hasExited || proc.pc >= statements.length) continue;

        const stmt = statements[proc.pc];
        if (!stmt) {
          proc.pc++;
          continue;
        }

        // Preset hint filtering (still same engine; just chooses which processes execute a given line)
        if (!shouldExecuteForProcess(proc, stmt)) {
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
              pc: proc.pc + 1, // child continues from next statement
              children: [],
              depth: proc.depth + 1,
              hasExited: false,
            };
            proc.children.push(child);
            proc.pc++; // parent continues from next statement

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
                // pc does NOT advance until a child is reaped
              } else {
                proc.pc++;
                tickLogs.push(`[WAIT] PID ${proc.pid} has no children to wait for, continuing`);
              }
            }
            break;
          }

          case 'exit': {
            proc.hasExited = true;

            // Orphan children (children keep running, PPID becomes 1)
            const activeChildren = proc.children.filter(
              c => (c.state === 'running' || c.state === 'orphan') && !c.hasExited
            );
            for (const child of activeChildren) {
              child.state = 'orphan';
              child.ppid = 1;
              tickLogs.push(`[STATE] PID ${child.pid} became ORPHAN (parent ${proc.pid} exited)`);
            }

            const parent = findProcess(tree, proc.ppid);

            // If parent is waiting, exit is immediately collected (no zombie)
            if (parent && parent.state === 'waiting') {
              proc.state = 'terminated';
              parent.state = 'running';
              parent.pc++; // wait() returns
              tickLogs.push(`[EXIT] PID ${proc.pid} terminated; parent PID ${parent.pid} resumed from wait()`);
              break;
            }

            // If parent is alive and not waiting => zombie
            if (parent && !parent.hasExited && parent.state !== 'terminated') {
              proc.state = 'zombie';
              tickLogs.push(`[EXIT] PID ${proc.pid} called exit()`);
              tickLogs.push(`[STATE] PID ${proc.pid} entered ZOMBIE (parent PID ${parent.pid} not waiting)`);
              break;
            }

            // If parent is init (PID 1) or already gone, init will reap → terminate cleanly
            proc.state = 'terminated';
            tickLogs.push(`[EXIT] PID ${proc.pid} called exit()`);
            tickLogs.push(`[STATE] PID ${proc.pid} terminated (reaped by init)`);
            break;
          }

          case 'sleep':
            proc.pc++;
            tickLogs.push(`[SLEEP] PID ${proc.pid} sleep()`);
            break;

          default:
            proc.pc++;
        }
      }

      setLogs(l => [...l, ...tickLogs]);
      setStepCount(s => s + 1);

      // Completion check
      const allAfter = getAllProcesses(tree);
      const stillActive = allAfter.filter(
        p =>
          (p.state === 'running' && !p.hasExited && p.pc < statements.length) ||
          p.state === 'waiting'
      );

      if (stillActive.length === 0 && !isComplete) {
        const zombies = allAfter.filter(p => p.state === 'zombie');
        const orphans = allAfter.filter(p => p.state === 'orphan');
        const runningNormal = allAfter.filter(p => p.state === 'running' && !p.hasExited);

        const summaryLogs: string[] = [];
        if (zombies.length > 0) {
          summaryLogs.push(
            `[WARN] 💀 ${zombies.length} zombie process(es) remain - parent never called wait()`
          );
        }
        if (orphans.length > 0) {
          summaryLogs.push(`[INFO] 👤 ${orphans.length} orphan process(es) adopted by init (PID 1)`);
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
