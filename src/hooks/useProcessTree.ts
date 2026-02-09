import { useState, useCallback } from 'react';
import { type ProcessNode, type ProcessState, type LogEntry } from '@/types/process';

let pidCounter = 1000;
let logIdCounter = 0;

const generatePid = () => ++pidCounter;
const generateLogId = () => `log-${++logIdCounter}`;

export type ExecutionMode = 'full' | 'until-selected';

export const useProcessTree = () => {
  const [root, setRoot] = useState<ProcessNode | null>(null);
  const [initProcess, setInitProcess] = useState<ProcessNode | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedNode, setSelectedNode] = useState<ProcessNode | null>(null);
  const [forkCount, setForkCount] = useState(0);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('full');
  const [executionBoundaryPid, setExecutionBoundaryPid] = useState<number | null>(null);
  const [executedPids, setExecutedPids] = useState<Set<number>>(new Set());
  const [executionComplete, setExecutionComplete] = useState(false);
  // New: Track currently executing PID and logical time for step-wise execution
  const [currentExecutingPid, setCurrentExecutingPid] = useState<number | null>(null);
  const [logicalTime, setLogicalTime] = useState<number>(0);
  // Store the computed execution path for consistency
  const [executionPath, setExecutionPath] = useState<number[]>([]);

  const addLog = useCallback((type: LogEntry['type'], message: string, pid?: number) => {
    const entry: LogEntry = {
      id: generateLogId(),
      timestamp: Date.now(),
      type,
      message,
      pid,
    };
    setLogs(prev => [...prev, entry]);
  }, []);

  const createRootProcess = useCallback(() => {
    // Reset counter to 1001 so root gets 1001, and first child gets 1002
    pidCounter = 1001;
    setForkCount(0);
    
    const rootPid = pidCounter; // Root gets PID 1001
    
    const rootNode: ProcessNode = {
      id: `process-${rootPid}`,
      pid: rootPid,
      ppid: 1,
      state: 'running',
      children: [],
      createdAt: Date.now(),
      depth: 0,
      forkLevel: 0,
    };
    
    const initNode: ProcessNode = {
      id: 'process-1',
      pid: 1,
      ppid: 0,
      state: 'running',
      children: [rootNode],
      createdAt: Date.now(),
      depth: -1,
      forkLevel: -1,
    };
    
    setInitProcess(initNode);
    setRoot(rootNode);
    setLogs([]);
    addLog('info', 'Init process (PID 1) exists - adopts orphan processes', 1);
    addLog('success', `Root process created with PID ${rootPid}`, rootPid);
    return rootNode;
  }, [addLog]);

  // Collect ALL running processes in the tree (flat list)
  const getAllRunningProcesses = useCallback((node: ProcessNode | null): ProcessNode[] => {
    if (!node) return [];
    const result: ProcessNode[] = [];
    if (node.state === 'running') {
      result.push(node);
    }
    for (const child of node.children) {
      result.push(...getAllRunningProcesses(child));
    }
    return result;
  }, []);

  const findNode = useCallback((node: ProcessNode | null, pid: number): ProcessNode | null => {
    if (!node) return null;
    if (node.pid === pid) return node;
    for (const child of node.children) {
      const found = findNode(child, pid);
      if (found) return found;
    }
    return null;
  }, []);

  const findInTree = useCallback((pid: number): ProcessNode | null => {
    if (initProcess) {
      return findNode(initProcess, pid);
    }
    return findNode(root, pid);
  }, [initProcess, root, findNode]);

  const updateNode = useCallback((
    node: ProcessNode,
    pid: number,
    updater: (n: ProcessNode) => ProcessNode
  ): ProcessNode => {
    if (node.pid === pid) {
      return updater(node);
    }
    return {
      ...node,
      children: node.children.map(child => updateNode(child, pid, updater)),
    };
  }, []);

  // ✅ UNIX fork() semantics (snapshot-based):
  // For ONE fork() call, take a snapshot of currently-running processes.
  // Each process in that snapshot creates EXACTLY ONE child.
  const forkAllProcesses = useCallback(() => {
    if (!root) {
      const newRoot = createRootProcess();
      setSelectedNode(newRoot);
      return [newRoot];
    }

    const newForkLevel = forkCount + 1;
    setForkCount(newForkLevel);

    // Snapshot of currently running processes (by PID + depth at time of fork)
    const runningSnapshot = getAllRunningProcesses(root).map((p) => ({
      pid: p.pid,
      depth: p.depth,
    }));

    addLog(
      'info',
      `fork() #${newForkLevel} called - snapshot has ${runningSnapshot.length} running process(es). Each creates exactly 1 child.`,
      undefined
    );
    addLog('info', `⚠️ Execution order is scheduler-dependent (non-deterministic)`, undefined);

    const createdChildren: ProcessNode[] = [];

    // Build the updated tree by attaching exactly one child per snapshot process
    let updatedRoot = root;
    for (const parent of runningSnapshot) {
      const childPid = generatePid();
      const childNode: ProcessNode = {
        id: `process-${childPid}`,
        pid: childPid,
        ppid: parent.pid,
        state: 'running',
        children: [],
        createdAt: Date.now(),
        depth: parent.depth + 1,
        forkLevel: newForkLevel,
      };

      createdChildren.push(childNode);
      updatedRoot = updateNode(updatedRoot, parent.pid, (n) => ({
        ...n,
        children: [...n.children, childNode],
      }));
    }

    setRoot(updatedRoot);

    // Keep init tree in sync if present
    if (initProcess) {
      setInitProcess((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          children: prev.children.map((c) => (c.pid === root.pid ? updatedRoot : c)),
        };
      });
    }

    for (const child of createdChildren) {
      addLog(
        'success',
        `fork() → PID ${child.ppid} created child PID ${child.pid} (fork #${newForkLevel})`,
        child.pid
      );
    }

    addLog(
      'info',
      `Total processes created by fork #${newForkLevel}: ${createdChildren.length} (total running immediately after fork: ${runningSnapshot.length + createdChildren.length})`,
      undefined
    );

    return createdChildren;
  }, [root, initProcess, forkCount, getAllRunningProcesses, createRootProcess, addLog, updateNode]);

  // Legacy single fork for specific parent (used in scenarios)
  const forkProcess = useCallback((parentPid: number) => {
    if (!root) {
      const newRoot = createRootProcess();
      setSelectedNode(newRoot);
      return newRoot;
    }

    const parent = findInTree(parentPid);
    if (!parent) {
      addLog('error', `Parent process ${parentPid} not found`);
      return null;
    }

    if (parent.state !== 'running') {
      addLog('error', `Cannot fork from ${parent.state} process`, parentPid);
      return null;
    }

    const newForkLevel = forkCount + 1;
    setForkCount(newForkLevel);

    const childPid = generatePid();
    const childNode: ProcessNode = {
      id: `process-${childPid}`,
      pid: childPid,
      ppid: parentPid,
      state: 'running',
      children: [],
      createdAt: Date.now(),
      depth: parent.depth + 1,
      forkLevel: newForkLevel,
    };

    const updateTree = (node: ProcessNode): ProcessNode => {
      if (node.pid === parentPid) {
        return {
          ...node,
          children: [...node.children, childNode],
        };
      }
      return {
        ...node,
        children: node.children.map(updateTree),
      };
    };

    const updatedRoot = updateTree(root);
    setRoot(updatedRoot);

    if (initProcess) {
      setInitProcess(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          children: prev.children.map(c => {
            if (c.pid === root.pid) return updatedRoot;
            return c;
          }),
        };
      });
    }

    addLog('success', `fork() by PID ${parentPid} → returns ${childPid} to parent, 0 to child`, childPid);
    return childNode;
  }, [root, initProcess, forkCount, findInTree, addLog, createRootProcess]);

  // ✅ OS-CORRECT wait() logic:
  // 1. If zombie children exist → reap them (zombie → terminated)
  // 2. If running children exist → block (waiting state)
  // 3. If no children → return immediately
  const waitProcess = useCallback((parentPid: number) => {
    if (!root) return;

    const parent = findInTree(parentPid);
    if (!parent) {
      addLog('error', `Process ${parentPid} not found`);
      return;
    }

    if (parent.state !== 'running' && parent.state !== 'orphan') {
      addLog('error', `Cannot call wait() from ${parent.state} process`, parentPid);
      return;
    }

    const runningChildren = parent.children.filter(c => c.state === 'running' || c.state === 'orphan');
    const zombieChildren = parent.children.filter(c => c.state === 'zombie');

    // Priority 1: If there are zombie children, reap them (collect exit status)
    if (zombieChildren.length > 0) {
      const zombie = zombieChildren[0];
      
      addLog('info', `wait() by PID ${parentPid} → Found zombie child PID ${zombie.pid}`, parentPid);
      
      const updateTree = (node: ProcessNode): ProcessNode => {
        if (node.pid === zombie.pid) {
          return { ...node, state: 'terminated' as ProcessState };
        }
        return {
          ...node,
          children: node.children.map(updateTree),
        };
      };

      const updatedRoot = updateTree(root);
      setRoot(updatedRoot);

      if (initProcess) {
        setInitProcess(prev => prev ? {
          ...prev,
          children: prev.children.map(c => c.pid === root.pid ? updatedRoot : c),
        } : prev);
      }

      addLog('success', `wait() by PID ${parentPid} → Reaped zombie PID ${zombie.pid} (exit status collected)`, parentPid);
      addLog('info', `Zombie PID ${zombie.pid} removed from process table`, zombie.pid);
      return;
    }

    // Priority 2: No zombies but running children exist → block
    if (runningChildren.length > 0) {
      const updateTree = (node: ProcessNode): ProcessNode => {
        if (node.pid === parentPid) {
          return { ...node, state: 'waiting' as ProcessState };
        }
        return {
          ...node,
          children: node.children.map(updateTree),
        };
      };

      const updatedRoot = updateTree(root);
      setRoot(updatedRoot);

      if (initProcess) {
        setInitProcess(prev => prev ? {
          ...prev,
          children: prev.children.map(c => c.pid === root.pid ? updatedRoot : c),
        } : prev);
      }

      addLog('info', `wait() by PID ${parentPid} → Blocking until child terminates`, parentPid);
      addLog('info', `Parent will wake when any child calls exit()`, parentPid);
      return;
    }

    // No children at all
    addLog('warning', `wait() by PID ${parentPid} → No children to wait for (returns -1)`, parentPid);
  }, [root, initProcess, findInTree, addLog]);

  // ✅ OS-CORRECT exitProcess logic:
  // ZOMBIE: Child exits + parent NOT waiting → child becomes zombie (terminated but not reaped)
  // ORPHAN: Parent exits + child still running → child adopted by init (still RUNNING)
  const exitProcess = useCallback((pid: number) => {
    if (!root) return;

    const node = findInTree(pid);
    if (!node) {
      addLog('error', `Process ${pid} not found`);
      return;
    }

    // Check if this process can exit
    if (node.state !== 'running' && node.state !== 'orphan') {
      addLog('error', `Cannot exit process in ${node.state} state`, pid);
      return;
    }

    // Find parent to determine if this will create a ZOMBIE
    const parent = findInTree(node.ppid);
    
    // Collect running/orphan children that will become orphans
    const activeChildren = node.children.filter(c => c.state === 'running' || c.state === 'orphan');
    
    // Log orphan creation first (children of exiting process)
    if (activeChildren.length > 0) {
      addLog('info', `[INFO] Parent PID ${pid} exiting with ${activeChildren.length} active child(ren)`, pid);
      activeChildren.forEach(c => {
        addLog('warning', `[STATE] PID ${c.pid} became ORPHAN`, c.pid);
        addLog('info', `[INFO] Kernel reassigned PPID ${c.ppid} → 1 (init)`, c.pid);
      });
    }

    // Determine exit state based on parent's state
    // UNIX-correct logic:
    // 1. If parent is init (PID 1) → always reaped immediately (init always calls wait)
    // 2. If parent called wait() → reaped immediately
    // 3. If parent is running but not waiting → ZOMBIE
    // 4. No parent → terminated
    let newState: ProcessState;
    
    if (node.ppid === 1) {
      // Parent is init - init always reaps immediately, no zombies possible
      newState = 'terminated';
      addLog('info', `[INFO] PID ${pid} exited`, pid);
      addLog('success', `exit() by PID ${pid} → Reaped immediately by init (PID 1)`, pid);
    } else if (parent?.state === 'waiting') {
      // Parent was waiting - child terminates normally and is reaped
      newState = 'terminated';
      addLog('info', `[INFO] Child PID ${pid} exited`, pid);
      addLog('success', `exit() by PID ${pid} → Terminated normally (parent called wait())`, pid);
    } else if (parent && parent.state === 'running') {
      // Parent is running but not waiting - child becomes ZOMBIE
      newState = 'zombie';
      addLog('info', `[INFO] Child PID ${pid} exited`, pid);
      addLog('warning', `[WARN] Parent PID ${parent.pid} did not call wait()`, parent.pid);
      addLog('error', `[STATE] PID ${pid} entered ZOMBIE state`, pid);
      addLog('info', `💀 Zombie: Process terminated but entry remains until parent calls wait()`, pid);
    } else {
      // No parent - just terminate
      newState = 'terminated';
      addLog('info', `[INFO] PID ${pid} exited`, pid);
    }

    // Build the updated tree - keep orphan children in place for visual hierarchy
    const markOrphans = (children: ProcessNode[]): ProcessNode[] => {
      return children.map(c => {
        if (c.state === 'running' || c.state === 'orphan') {
          return { ...c, ppid: 1, state: 'orphan' as ProcessState, isOrphan: true };
        }
        return c;
      });
    };

    const updateTree = (n: ProcessNode): ProcessNode => {
      if (n.pid === pid) {
        return {
          ...n,
          state: newState,
          // Keep children in tree but mark active ones as orphans
          children: activeChildren.length > 0 ? markOrphans(n.children) : n.children,
        };
      }
      return {
        ...n,
        children: n.children.map(updateTree),
      };
    };

    let updatedRoot = updateTree(root);

    // Sync init process tree
    if (initProcess) {
      setInitProcess(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          children: prev.children.map(c => c.pid === root.pid ? updatedRoot : c),
        };
      });
    }

    // If parent was waiting, wake it up after child exits
    if (parent?.state === 'waiting') {
      const remainingActive = parent.children.filter(
        c => c.pid !== pid && (c.state === 'running' || c.state === 'orphan')
      );
      if (remainingActive.length === 0) {
        updatedRoot = updateNode(updatedRoot, parent.pid, (p) => ({
          ...p,
          state: 'running' as ProcessState,
        }));
        addLog('success', `Parent PID ${parent.pid} resumed (all children terminated)`, parent.pid);
      }
    }

    setRoot(updatedRoot);
  }, [root, initProcess, findInTree, updateNode, addLog]);

  const resetTree = useCallback(() => {
    pidCounter = 1000;
    logIdCounter = 0;
    setRoot(null);
    setInitProcess(null);
    setSelectedNode(null);
    setLogs([]);
    setForkCount(0);
    setExecutionBoundaryPid(null);
    setExecutedPids(new Set());
    setExecutionComplete(false);
    setCurrentExecutingPid(null);
    setLogicalTime(0);
    setExecutionPath([]);
  }, []);

  // Get ancestor chain (path from root to target node)
  const getAncestorChain = useCallback((targetPid: number): number[] => {
    if (!root) return [];
    
    const path: number[] = [];
    
    const findPath = (node: ProcessNode, target: number, currentPath: number[]): boolean => {
      currentPath.push(node.pid);
      
      if (node.pid === target) {
        path.push(...currentPath);
        return true;
      }
      
      for (const child of node.children) {
        if (findPath(child, target, [...currentPath])) {
          return true;
        }
      }
      
      return false;
    };
    
    findPath(root, targetPid, []);
    return path;
  }, [root]);

  // Check if a node is in the execution path (for visual dimming)
  const isInExecutionPath = useCallback((pid: number): boolean => {
    if (executionMode === 'full') return true;
    if (!executionBoundaryPid) return true;
    
    const ancestorChain = getAncestorChain(executionBoundaryPid);
    return ancestorChain.includes(pid);
  }, [executionMode, executionBoundaryPid, getAncestorChain]);

  // Start node-scoped execution - computes and stores path, resets execution state
  const startScopedExecution = useCallback((targetPid: number) => {
    const ancestorChain = getAncestorChain(targetPid);
    
    // Store the execution path for step-by-step traversal
    setExecutionPath(ancestorChain);
    setExecutionBoundaryPid(targetPid);
    setExecutedPids(new Set());
    setExecutionComplete(false);
    setCurrentExecutingPid(null);
    setLogicalTime(0);
    
    addLog('info', `[SCOPED] Starting execution until PID ${targetPid}`, targetPid);
    
    if (ancestorChain.length > 0) {
      addLog('info', `[PATH] Execution sequence: ${ancestorChain.join(' → ')}`, undefined);
      addLog('info', `[TIME] t=0, waiting for first step (${ancestorChain.length} steps total)`, undefined);
    }
  }, [getAncestorChain, addLog]);

  // Execute next step in scoped execution - advances cursor by exactly one position
  const executeNextScopedStep = useCallback(() => {
    if (!root || !executionBoundaryPid || executionComplete) return null;
    
    // Use stored execution path for consistency
    if (executionPath.length === 0) return null;
    
    // Find the current execution index (how many have been executed)
    const currentIndex = executedPids.size;
    
    // Check if we've completed all steps
    if (currentIndex >= executionPath.length) {
      setExecutionComplete(true);
      setCurrentExecutingPid(null);
      return null;
    }
    
    // Get the next PID to execute
    const nextPid = executionPath[currentIndex];
    const nextTime = currentIndex + 1;
    
    // Update state: mark as currently executing, then add to executed set
    setCurrentExecutingPid(nextPid);
    setExecutedPids(prev => new Set([...prev, nextPid]));
    setLogicalTime(nextTime);
    
    const node = findNode(root, nextPid);
    if (node) {
      addLog('success', `[t=${nextTime}] PID ${nextPid} executes`, nextPid);
      
      // Check if this was the final step (boundary reached)
      if (nextPid === executionBoundaryPid) {
        setExecutionComplete(true);
        addLog('info', `[DONE] Scoped execution complete at t=${nextTime}`, nextPid);
        // Clear current executing after completion
        setTimeout(() => setCurrentExecutingPid(null), 300);
      } else {
        // Show what's next
        const remaining = executionPath.length - nextTime;
        addLog('info', `[NEXT] ${remaining} step(s) remaining`, undefined);
      }
      
      return node;
    }
    
    return null;
  }, [root, executionBoundaryPid, executionComplete, executedPids, executionPath, findNode, addLog]);

  // Reset scoped execution state
  const resetScopedExecution = useCallback(() => {
    setExecutionBoundaryPid(null);
    setExecutedPids(new Set());
    setExecutionComplete(false);
    setCurrentExecutingPid(null);
    setLogicalTime(0);
    setExecutionPath([]);
  }, []);

  const getAllNodes = useCallback((node: ProcessNode | null): ProcessNode[] => {
    if (!node) return [];
    return [node, ...node.children.flatMap(c => getAllNodes(c))];
  }, []);

  return {
    root,
    setRoot,
    initProcess,
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
    setSelectedNode,
    setExecutionMode,
    createRootProcess,
    forkProcess,
    forkAllProcesses,
    waitProcess,
    exitProcess,
    resetTree,
    findNode: findInTree,
    getAllNodes,
    getAllRunningProcesses,
    addLog,
    getAncestorChain,
    isInExecutionPath,
    startScopedExecution,
    executeNextScopedStep,
    resetScopedExecution,
  };
};
