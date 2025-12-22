import { useState, useCallback } from 'react';
import { ProcessNode, ProcessState, LogEntry } from '@/types/process';

let pidCounter = 1000;
let logIdCounter = 0;

const generatePid = () => ++pidCounter;
const generateLogId = () => `log-${++logIdCounter}`;

export const useProcessTree = () => {
  const [root, setRoot] = useState<ProcessNode | null>(null);
  const [initProcess, setInitProcess] = useState<ProcessNode | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedNode, setSelectedNode] = useState<ProcessNode | null>(null);
  const [forkCount, setForkCount] = useState(0);

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
    pidCounter = 1000;
    setForkCount(0);
    
    // Create init process (PID 1)
    const rootNode: ProcessNode = {
      id: `process-1001`,
      pid: 1001,
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
    addLog('success', `Root process created with PID 1001`, 1001);
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

  // CORRECT fork() semantics: fork duplicates ALL active processes
  // Each running process creates one child
  const forkAllProcesses = useCallback(() => {
    if (!root) {
      const newRoot = createRootProcess();
      setSelectedNode(newRoot);
      return [newRoot];
    }

    const newForkLevel = forkCount + 1;
    setForkCount(newForkLevel);

    // Get all currently running processes
    const runningProcesses = getAllRunningProcesses(root);
    const newChildren: ProcessNode[] = [];

    addLog('info', `fork() called - duplicating ${runningProcesses.length} running process(es)`, undefined);
    addLog('info', `⚠️ Execution order is scheduler-dependent (non-deterministic)`, undefined);

    // Create one child for each running process
    const createChildren = (tree: ProcessNode): ProcessNode => {
      if (tree.state !== 'running') {
        return {
          ...tree,
          children: tree.children.map(c => createChildren(c)),
        };
      }

      const childPid = generatePid();
      const childNode: ProcessNode = {
        id: `process-${childPid}`,
        pid: childPid,
        ppid: tree.pid,
        state: 'running',
        children: [],
        createdAt: Date.now(),
        depth: tree.depth + 1,
        forkLevel: newForkLevel,
      };
      newChildren.push(childNode);

      return {
        ...tree,
        children: [...tree.children.map(c => createChildren(c)), childNode],
      };
    };

    const updatedRoot = createChildren(root);
    setRoot(updatedRoot);

    // Update init process if it exists
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

    // Log each new child
    newChildren.forEach(child => {
      addLog('success', `fork() → PID ${child.ppid} created child PID ${child.pid} (fork #${newForkLevel})`, child.pid);
    });

    addLog('info', `Total processes after fork #${newForkLevel}: ${runningProcesses.length + newChildren.length}`, undefined);

    return newChildren;
  }, [root, initProcess, forkCount, getAllRunningProcesses, createRootProcess, addLog]);

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

  const waitProcess = useCallback((parentPid: number) => {
    if (!root) return;

    const parent = findInTree(parentPid);
    if (!parent) {
      addLog('error', `Process ${parentPid} not found`);
      return;
    }

    const runningChildren = parent.children.filter(c => c.state === 'running');
    const zombieChildren = parent.children.filter(c => c.state === 'zombie');

    // If there are zombie children, reap them
    if (zombieChildren.length > 0) {
      const zombie = zombieChildren[0];
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

      addLog('success', `wait() by PID ${parentPid} → Reaped zombie PID ${zombie.pid}`, parentPid);
      return;
    }

    if (runningChildren.length === 0) {
      addLog('warning', `wait() by PID ${parentPid} → No children to wait for`, parentPid);
      return;
    }

    // Set parent to waiting state
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
  }, [root, initProcess, findInTree, addLog]);

  const exitProcess = useCallback((pid: number) => {
    if (!root) return;

    const node = findInTree(pid);
    if (!node) {
      addLog('error', `Process ${pid} not found`);
      return;
    }

    // Handle orphan creation: if this process has running children
    const runningChildren = node.children.filter(c => c.state === 'running');
    if (runningChildren.length > 0) {
      addLog('warning', `exit() by PID ${pid} → ${runningChildren.length} child(ren) become ORPHAN`, pid);
      runningChildren.forEach(c => {
        addLog('info', `PID ${c.pid} adopted by init (PID 1), PPID changes from ${c.ppid} to 1`, c.pid);
      });
    }

    // Find parent to check if it's waiting
    const parent = findInTree(node.ppid);
    const newState: ProcessState = parent?.state === 'waiting' ? 'terminated' : 'zombie';

    // Build the updated tree
    const updateTree = (n: ProcessNode): ProcessNode => {
      if (n.pid === pid) {
        // Mark children as orphans and move them
        const orphanedChildren = n.children.map(c => ({
          ...c,
          ppid: 1,
          state: c.state === 'running' ? 'orphan' as ProcessState : c.state,
          isOrphan: c.state === 'running',
          depth: 1,
          children: c.children,
        }));

        return {
          ...n,
          state: newState,
          children: orphanedChildren.filter(c => c.state !== 'orphan'), // Remove orphans, they go to init
        };
      }
      return {
        ...n,
        children: n.children.map(updateTree),
      };
    };

    let updatedRoot = updateTree(root);

    // Move orphans to init
    if (runningChildren.length > 0 && initProcess) {
      const orphans = runningChildren.map(c => ({
        ...c,
        ppid: 1,
        state: 'orphan' as ProcessState,
        isOrphan: true,
        depth: 1,
      }));

      setInitProcess(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          children: [...prev.children.filter(c => c.pid !== root.pid), updatedRoot, ...orphans],
        };
      });
    } else if (initProcess) {
      setInitProcess(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          children: prev.children.map(c => c.pid === root.pid ? updatedRoot : c),
        };
      });
    }

    // If parent was waiting, wake it up
    if (parent?.state === 'waiting') {
      const remainingRunning = parent.children.filter(c => c.pid !== pid && c.state === 'running');
      if (remainingRunning.length === 0) {
        updatedRoot = updateNode(updatedRoot, parent.pid, (p) => ({
          ...p,
          state: 'running' as ProcessState,
        }));
      }
      addLog('success', `exit() by PID ${pid} → Terminated normally (parent was waiting)`, pid);
    } else {
      addLog('warning', `exit() by PID ${pid} → Became ZOMBIE (parent not waiting)`, pid);
      addLog('info', `💀 Zombie: Process finished but exit status not collected by parent`, pid);
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
  }, []);

  const getAllNodes = useCallback((node: ProcessNode | null): ProcessNode[] => {
    if (!node) return [];
    return [node, ...node.children.flatMap(c => getAllNodes(c))];
  }, []);

  return {
    root,
    initProcess,
    logs,
    selectedNode,
    forkCount,
    setSelectedNode,
    createRootProcess,
    forkProcess,
    forkAllProcesses, // NEW: Correct fork semantics
    waitProcess,
    exitProcess,
    resetTree,
    findNode: findInTree,
    getAllNodes,
    getAllRunningProcesses,
    addLog,
  };
};
