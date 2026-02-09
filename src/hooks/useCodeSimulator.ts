import { useState, useCallback } from 'react';

// Simulated process with program counter
export interface SimProcess {
  pid: number;
  ppid: number;
  state: 'running' | 'waiting' | 'zombie' | 'orphan' | 'terminated';
  pc: number;
  children: SimProcess[];
  depth: number;
  hasExited: boolean;
  isOriginalParent: boolean;
  forkGeneration: number;
  isChildBranch: boolean; // true if this process took the child path at a fork-if
}

// Parsed instruction from code
export interface Instruction {
  type: 'fork' | 'fork-if' | 'wait' | 'exit' | 'sleep' | 'printf' | 'start' | 'end-block' | 'else-block' | 'noop';
  scope: 'any' | 'parent' | 'child';
  lineNumber: number;
  code: string;
  osExplanation: string;
  blockDepth: number; // brace nesting level
  branchId?: number;  // links fork-if, else-block, end-block
}

let pidCounter = 1000;
const generatePid = () => ++pidCounter;

/**
 * Preprocess: unroll for-loops into repeated blocks.
 * Supports: for(int i = 0; i < N; i++) { ... }
 * Caps at 10 iterations for safety.
 */
function unrollForLoops(code: string): string {
  let result = code;
  let safety = 0;

  // Repeatedly find and unroll the innermost for loop
  while (safety++ < 20) {
    const forMatch = result.match(
      /for\s*\(\s*(?:int\s+)?\w+\s*=\s*(\d+)\s*;\s*\w+\s*(<=?|>=?)\s*(\d+)\s*;\s*\w+\s*(\+\+|--)\s*\)\s*\{/
    );
    if (!forMatch) break;

    const start = parseInt(forMatch[1]);
    const op = forMatch[2];
    const bound = parseInt(forMatch[3]);
    const inc = forMatch[4];

    let iterations = 0;
    if (inc === '++') {
      iterations = op === '<' ? bound - start : op === '<=' ? bound - start + 1 : 0;
    } else {
      iterations = op === '>' ? start - bound : op === '>=' ? start - bound + 1 : 0;
    }
    iterations = Math.max(0, Math.min(iterations, 10)); // cap

    // Find the for statement start index
    const forIdx = result.indexOf(forMatch[0]);
    // Find matching closing brace
    const bodyStart = forIdx + forMatch[0].length;
    let braceCount = 1;
    let bodyEnd = bodyStart;
    while (bodyEnd < result.length && braceCount > 0) {
      if (result[bodyEnd] === '{') braceCount++;
      if (result[bodyEnd] === '}') braceCount--;
      bodyEnd++;
    }

    const body = result.substring(bodyStart, bodyEnd - 1);

    let unrolled = '';
    for (let i = 0; i < iterations; i++) {
      unrolled += `// [loop iteration ${i + 1}/${iterations}]\n${body}\n`;
    }

    result = result.substring(0, forIdx) + unrolled + result.substring(bodyEnd);
  }

  return result;
}

/**
 * Block-aware C code parser for process lifecycle simulation.
 * Handles:
 *   - for loops (unrolled)
 *   - fork()               standalone fork
 *   - if(fork() == 0) { }  child block
 *   - if(pid < 0) { }      error block (skipped)
 *   - else { }             parent block
 *   - wait(NULL) / waitpid
 *   - exit(n) / return
 *   - sleep(n)
 *   - printf(...)
 *   - getpid() / getppid() in printf
 */
function parseCode(rawCode: string): Instruction[] {
  // Pre-process: unroll for loops
  const code = unrollForLoops(rawCode);
  const lines = code.split('\n');
  const instructions: Instruction[] = [];
  let branchCounter = 0;
  let currentScope: 'any' | 'parent' | 'child' = 'any';
  let braceDepth = 0;
  const scopeStack: { scope: 'any' | 'parent' | 'child'; braceDepth: number; branchId: number }[] = [];

  // Track "skip block" for error-handling blocks like if(pid < 0)
  let skipBlockDepth = -1; // -1 means not skipping

  instructions.push({
    type: 'start',
    scope: 'any',
    lineNumber: 0,
    code: 'main()',
    osExplanation: 'Program starts with a single process (the original parent).',
    blockDepth: 0,
  });

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    const lineNum = i + 1;

    // Track brace depth for all lines
    let lineOpenBraces = 0;
    let lineCloseBraces = 0;
    // Don't count braces inside strings
    let inString = false;
    for (const ch of trimmed) {
      if (ch === '"') inString = !inString;
      if (inString) continue;
      if (ch === '{') lineOpenBraces++;
      if (ch === '}') lineCloseBraces++;
    }

    const bracesBefore = braceDepth;
    braceDepth += lineOpenBraces - lineCloseBraces;

    // Handle skip block (error-handling if(pid < 0) blocks)
    if (skipBlockDepth >= 0) {
      if (braceDepth <= skipBlockDepth) {
        skipBlockDepth = -1; // done skipping
      }
      // Check if this is an else after the skipped error block
      if (skipBlockDepth < 0 && (trimmed.match(/^\}\s*else\s*\{?$/) || trimmed === 'else {' || trimmed === '} else {')) {
        // Don't skip the else — it's the success path
      } else {
        continue;
      }
    }

    // Skip includes, comments, blank lines, declarations, loop iteration markers
    if (
      trimmed === '' ||
      trimmed.startsWith('#include') ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('*/') ||
      trimmed.match(/^int\s+main\s*\(/) ||
      trimmed === '}'
    ) {
      // Handle scope exit on closing brace
      if (lineCloseBraces > 0 && scopeStack.length > 0) {
        const top = scopeStack[scopeStack.length - 1];
        if (braceDepth <= top.braceDepth) {
          scopeStack.pop();
          currentScope = scopeStack.length > 0 ? scopeStack[scopeStack.length - 1].scope : 'any';
        }
      }
      continue;
    }

    // Pattern: if(pid < 0) or if(pid == -1) — error handling, skip entire block
    if (trimmed.match(/if\s*\(\s*\w+\s*(<\s*0|==\s*-1)\s*\)/)) {
      skipBlockDepth = bracesBefore;
      continue;
    }

    // Pattern: return — treat as exit()
    if (trimmed.match(/^return\s/)) {
      instructions.push({
        type: 'exit',
        scope: currentScope,
        lineNumber: lineNum,
        code: trimmed,
        osExplanation: 'return exits the process. Equivalent to exit() from main().',
        blockDepth: bracesBefore,
      });
      continue;
    }

    // Pattern: if(fork() == 0) { ... } — child block
    if (trimmed.match(/if\s*\(\s*fork\s*\(\s*\)\s*(==|!=)\s*0\s*\)/)) {
      const isEquals = trimmed.includes('==');
      branchCounter++;
      const branchId = branchCounter;

      instructions.push({
        type: 'fork-if',
        scope: currentScope,
        lineNumber: lineNum,
        code: trimmed,
        osExplanation: `fork() creates a child process. The ${isEquals ? 'if-block runs in the child' : 'if-block runs in the parent'} (fork returns 0 to child, PID to parent).`,
        blockDepth: bracesBefore,
        branchId,
      });

      scopeStack.push({
        scope: isEquals ? 'child' : 'parent',
        braceDepth: bracesBefore,
        branchId,
      });
      currentScope = isEquals ? 'child' : 'parent';
      continue;
    }

    // Pattern: pid_t pid = fork(); or pid = fork();
    if (trimmed.match(/(pid_t\s+\w+|int\s+\w+|\w+)\s*=\s*fork\s*\(\s*\)/)) {
      instructions.push({
        type: 'fork',
        scope: currentScope,
        lineNumber: lineNum,
        code: trimmed,
        osExplanation: 'fork() creates a child process. Return value stored: 0 in child, child PID in parent.',
        blockDepth: bracesBefore,
      });
      continue;
    }

    // Pattern: else { ... } — after a fork-if, this is the parent block
    if (trimmed.match(/^\}\s*else\s*\{?$/) || trimmed === 'else {' || trimmed === '} else {') {
      if (scopeStack.length > 0) {
        const top = scopeStack[scopeStack.length - 1];
        const newScope = top.scope === 'child' ? 'parent' : 'child';
        scopeStack[scopeStack.length - 1] = { ...top, scope: newScope };
        currentScope = newScope;

        instructions.push({
          type: 'else-block',
          scope: 'any',
          lineNumber: lineNum,
          code: trimmed,
          osExplanation: `Now executing the ${newScope} branch.`,
          blockDepth: bracesBefore,
          branchId: top.branchId,
        });
      }
      continue;
    }

    // Pattern: if(pid == 0) or if(pid > 0) after a fork variable assignment
    if (trimmed.match(/if\s*\(\s*\w+\s*(==|>|!=)\s*0\s*\)/)) {
      const op = trimmed.match(/(==|>|!=)/)?.[1];
      branchCounter++;
      const branchId = branchCounter;
      let blockScope: 'child' | 'parent' = 'child';
      if (op === '>' || op === '!=') blockScope = 'parent';

      instructions.push({
        type: 'noop',
        scope: currentScope,
        lineNumber: lineNum,
        code: trimmed,
        osExplanation: `Branch: ${blockScope === 'child' ? 'child process path (pid == 0)' : 'parent process path (pid > 0)'}`,
        blockDepth: bracesBefore,
        branchId,
      });

      scopeStack.push({ scope: blockScope, braceDepth: bracesBefore, branchId });
      currentScope = blockScope;
      continue;
    }

    // Standalone fork()
    if (trimmed.includes('fork()')) {
      instructions.push({
        type: 'fork',
        scope: currentScope,
        lineNumber: lineNum,
        code: trimmed,
        osExplanation: 'fork() duplicates the calling process. Both parent and child continue from this point.',
        blockDepth: bracesBefore,
      });
      continue;
    }

    // wait() / waitpid()
    if (trimmed.includes('wait(') || trimmed.includes('waitpid(')) {
      instructions.push({
        type: 'wait',
        scope: currentScope,
        lineNumber: lineNum,
        code: trimmed,
        osExplanation: 'wait() blocks the parent until a child exits. Reaps the child (collects exit status).',
        blockDepth: bracesBefore,
      });
      continue;
    }

    // exit()
    if (trimmed.match(/\bexit\s*\(/)) {
      instructions.push({
        type: 'exit',
        scope: currentScope,
        lineNumber: lineNum,
        code: trimmed,
        osExplanation: 'exit() terminates the calling process. May create zombie if parent hasn\'t called wait(), or orphan children if this process has running children.',
        blockDepth: bracesBefore,
      });
      continue;
    }

    // sleep()
    if (trimmed.includes('sleep(')) {
      instructions.push({
        type: 'sleep',
        scope: currentScope,
        lineNumber: lineNum,
        code: trimmed,
        osExplanation: 'sleep() pauses execution for the given duration. Process remains alive.',
        blockDepth: bracesBefore,
      });
      continue;
    }

    // printf()
    if (trimmed.includes('printf(')) {
      let explanation = 'printf() outputs text to stdout.';
      if (trimmed.includes('getpid()')) explanation += ' getpid() returns the current process ID.';
      if (trimmed.includes('getppid()')) explanation += ' getppid() returns the parent process ID.';

      instructions.push({
        type: 'printf',
        scope: currentScope,
        lineNumber: lineNum,
        code: trimmed,
        osExplanation: explanation,
        blockDepth: bracesBefore,
      });
      continue;
    }

    // Check for closing brace scope exit
    if (braceDepth < bracesBefore && scopeStack.length > 0) {
      const top = scopeStack[scopeStack.length - 1];
      if (braceDepth <= top.braceDepth) {
        scopeStack.pop();
        currentScope = scopeStack.length > 0 ? scopeStack[scopeStack.length - 1].scope : 'any';
      }
    }
  }

  return instructions;
}

export const useCodeSimulator = () => {
  const [processes, setProcesses] = useState<SimProcess[]>([]);
  const [statements, setStatements] = useState<Instruction[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [stepCount, setStepCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const initializeSimulation = useCallback((code: string) => {
    pidCounter = 1000;
    const parsed = parseCode(code);
    setStatements(parsed);
    setStepCount(0);
    setIsComplete(false);

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
      isChildBranch: false,
    };

    setProcesses([root]);
    setLogs(['[INIT] Created root process PID 1001 (parent: init PID 1)']);
    return parsed;
  }, []);

  const cloneTree = (procs: SimProcess[]): SimProcess[] =>
    procs.map(p => ({ ...p, children: cloneTree(p.children) }));

  const findProcess = (procs: SimProcess[], pid: number): SimProcess | null => {
    for (const p of procs) {
      if (p.pid === pid) return p;
      const found = findProcess(p.children, pid);
      if (found) return found;
    }
    return null;
  };

  const getAllProcesses = (procs: SimProcess[]): SimProcess[] => {
    const result: SimProcess[] = [];
    for (const p of procs) {
      result.push(p);
      result.push(...getAllProcesses(p.children));
    }
    return result;
  };

  const shouldExecute = (proc: SimProcess, instr: Instruction): boolean => {
    if (instr.scope === 'any') return true;
    if (instr.scope === 'child') return proc.isChildBranch;
    if (instr.scope === 'parent') return !proc.isChildBranch;
    return true;
  };

  const executeStep = useCallback(() => {
    if (statements.length === 0) return null;

    setProcesses(prev => {
      const tree = cloneTree(prev);
      const all = getAllProcesses(tree);

      const runnable = all.filter(
        p => p.state === 'running' && !p.hasExited && p.pc < statements.length
      );

      if (runnable.length === 0) {
        // Try to reap zombies for waiting processes
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

        if (!isComplete) {
          finishSimulation(all);
        }
        return tree;
      }

      const tickLogs: string[] = [];

      for (const procSnap of runnable) {
        const proc = findProcess(tree, procSnap.pid);
        if (!proc || proc.state !== 'running' || proc.hasExited || proc.pc >= statements.length) continue;

        const instr = statements[proc.pc];
        if (!instr) { proc.pc++; continue; }

        // Skip instructions not meant for this process's branch
        if (!shouldExecute(proc, instr)) {
          proc.pc++;
          continue;
        }

        // Skip marker instructions
        if (instr.type === 'noop' || instr.type === 'else-block' || instr.type === 'end-block') {
          proc.pc++;
          continue;
        }

        switch (instr.type) {
          case 'start':
            tickLogs.push(`[EXEC] PID ${proc.pid} → program started`);
            proc.pc++;
            break;

          case 'fork':
          case 'fork-if': {
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
              isChildBranch: true,
            };
            // For fork-if, mark parent as non-child-branch for the scoped block
            if (instr.type === 'fork-if') {
              // The parent continues but is NOT the child branch
              // (it was already whatever it was)
            }
            proc.children.push(child);
            proc.pc++;
            tickLogs.push(`[FORK] PID ${proc.pid} created child PID ${childPid} (fork returns ${childPid} to parent, 0 to child)`);
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
                tickLogs.push(`[WAIT] PID ${proc.pid} blocked — waiting for child to exit`);
              } else {
                proc.pc++;
                tickLogs.push(`[WAIT] PID ${proc.pid} — no children to wait for, continuing`);
              }
            }
            break;
          }

          case 'exit': {
            proc.hasExited = true;

            // Orphan running children
            for (const child of proc.children) {
              if ((child.state === 'running' || child.state === 'orphan') && !child.hasExited) {
                child.state = 'orphan';
                child.ppid = 1;
                tickLogs.push(`[STATE] PID ${child.pid} → ORPHAN (parent ${proc.pid} exited, adopted by init)`);
              }
            }

            const parent = findProcess(tree, proc.ppid);

            if (parent && parent.state === 'waiting') {
              proc.state = 'terminated';
              parent.state = 'running';
              parent.pc++;
              tickLogs.push(`[EXIT] PID ${proc.pid} exited → parent PID ${parent.pid} resumed from wait()`);
              break;
            }

            if (parent && !parent.hasExited && parent.state !== 'terminated') {
              proc.state = 'zombie';
              tickLogs.push(`[EXIT] PID ${proc.pid} exited → ZOMBIE (parent ${parent.pid} hasn't called wait())`);
              break;
            }

            proc.state = 'terminated';
            tickLogs.push(`[EXIT] PID ${proc.pid} terminated (reaped by init)`);
            break;
          }

          case 'sleep':
            proc.pc++;
            tickLogs.push(`[SLEEP] PID ${proc.pid} sleeping`);
            break;

          case 'printf': {
            // Simulate printf output
            const printfMatch = instr.code.match(/printf\s*\(\s*"([^"]*)".*\)/);
            let output = printfMatch?.[1] || 'output';
            output = output.replace(/\\n/g, '');
            // Replace format specifiers with simulated values
            if (instr.code.includes('getpid()')) {
              output = output.replace(/%d/, String(proc.pid));
            }
            if (instr.code.includes('getppid()')) {
              output = output.replace(/%d/, String(proc.ppid));
            }
            tickLogs.push(`[PRINT] PID ${proc.pid}: ${output}`);
            proc.pc++;
            break;
          }

          default:
            proc.pc++;
        }
      }

      setLogs(l => [...l, ...tickLogs]);
      setStepCount(s => s + 1);

      // Check completion
      const allAfter = getAllProcesses(tree);
      const stillActive = allAfter.filter(
        p => (p.state === 'running' && !p.hasExited && p.pc < statements.length) || p.state === 'waiting'
      );

      if (stillActive.length === 0 && !isComplete) {
        finishSimulation(allAfter);
      }

      return tree;
    });

    return statements[stepCount] || null;
  }, [statements, stepCount, isComplete]);

  const finishSimulation = (all: SimProcess[]) => {
    const zombies = all.filter(p => p.state === 'zombie');
    const orphans = all.filter(p => p.state === 'orphan');
    const running = all.filter(p => p.state === 'running' && !p.hasExited);

    const summary: string[] = [];
    if (zombies.length > 0) summary.push(`[WARN] 💀 ${zombies.length} zombie(s) — parent never called wait()`);
    if (orphans.length > 0) summary.push(`[INFO] 👤 ${orphans.length} orphan(s) adopted by init`);
    if (running.length > 0 && zombies.length === 0 && orphans.length === 0) {
      summary.push(`[INFO] ✓ ${running.length} process(es) completed normally`);
    }
    summary.push('[DONE] Simulation complete');
    setLogs(l => [...l, ...summary]);
    setIsComplete(true);
  };

  const reset = useCallback(() => {
    pidCounter = 1000;
    setProcesses([]);
    setStatements([]);
    setLogs([]);
    setStepCount(0);
    setIsComplete(false);
  }, []);

  const getCurrentStatement = useCallback((): Instruction | null => {
    if (processes.length === 0) return null;
    const all = getAllProcesses(processes);
    const running = all.filter(p => p.state === 'running' && !p.hasExited && p.pc < statements.length);
    if (running.length === 0) return null;
    return statements[running[0].pc] || null;
  }, [processes, statements]);

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
