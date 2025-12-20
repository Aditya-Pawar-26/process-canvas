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
    
    // Create init process (PID 1)
    const initNode: ProcessNode = {
      id: 'process-1',
      pid: 1,
      ppid: 0,
      state: 'running',
      children: [],
      createdAt: Date.now(),
      depth: 0,
    };
    
    // Create user root process
    const rootNode: ProcessNode = {
      id: `process-${generatePid()}`,
      pid: 1001,
      ppid: 1,
      state: 'running',
      children: [],
      createdAt: Date.now(),
      depth: 1,
    };
    
    initNode.children = [rootNode];
    setInitProcess(initNode);
    setRoot(rootNode);
    setLogs([]);
    addLog('info', 'Init process (PID 1) exists', 1);
    addLog('info', 'Root process created', rootNode.pid);
    return rootNode;
  }, [addLog]);

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

    const childPid = generatePid();
    const childNode: ProcessNode = {
      id: `process-${childPid}`,
      pid: childPid,
      ppid: parentPid,
      state: 'running',
      children: [],
      createdAt: Date.now(),
      depth: parent.depth + 1,
    };

    if (initProcess) {
      setInitProcess(prev => {
        if (!prev) return prev;
        return updateNode(prev, parentPid, (n) => ({
          ...n,
          children: [...n.children, childNode],
        }));
      });
    }
    
    setRoot(prev => {
      if (!prev) return prev;
      return updateNode(prev, parentPid, (n) => ({
        ...n,
        children: [...n.children, childNode],
      }));
    });

    addLog('success', `fork() called by PID ${parentPid} → Child PID ${childPid} created`, childPid);
    return childNode;
  }, [root, initProcess, findInTree, updateNode, addLog, createRootProcess]);

  const waitProcess = useCallback((parentPid: number) => {
    if (!root) return;

    const parent = findInTree(parentPid);
    if (!parent) {
      addLog('error', `Process ${parentPid} not found`);
      return;
    }

    const runningChildren = parent.children.filter(c => c.state === 'running');
    if (runningChildren.length === 0) {
      addLog('warning', `No running children to wait for`, parentPid);
      return;
    }

    const updateInTree = (tree: ProcessNode) => {
      return updateNode(tree, parentPid, (n) => ({
        ...n,
        state: 'waiting' as ProcessState,
      }));
    };

    if (initProcess) {
      setInitProcess(prev => prev ? updateInTree(prev) : prev);
    }
    setRoot(prev => prev ? updateInTree(prev) : prev);

    addLog('info', `wait() called by PID ${parentPid} → Waiting for children`, parentPid);
  }, [root, initProcess, findInTree, updateNode, addLog]);

  const exitProcess = useCallback((pid: number, createOrphan: boolean = false) => {
    if (!root) return;

    const node = findInTree(pid);
    if (!node) {
      addLog('error', `Process ${pid} not found`);
      return;
    }

    // Check if this process has children - if so, they become orphans
    if (node.children.length > 0 && !createOrphan) {
      // Make children orphans - re-parent to init (PID 1)
      const orphanChildren = node.children.filter(c => c.state === 'running');
      
      if (orphanChildren.length > 0) {
        // Update children to be orphans
        const updateChildren = (tree: ProcessNode): ProcessNode => {
          if (tree.pid === pid) {
            return {
              ...tree,
              children: tree.children.map(child => ({
                ...child,
                ppid: 1,
                state: 'orphan' as ProcessState,
                isOrphan: true,
              })),
            };
          }
          return {
            ...tree,
            children: tree.children.map(c => updateChildren(c)),
          };
        };

        if (initProcess) {
          setInitProcess(prev => {
            if (!prev) return prev;
            let updated = updateChildren(prev);
            // Move orphan children to init
            const orphans = node.children.map(c => ({
              ...c,
              ppid: 1,
              state: 'orphan' as ProcessState,
              isOrphan: true,
              depth: 1,
            }));
            updated = {
              ...updated,
              children: [...updated.children.filter(c => c.pid !== pid), ...orphans],
            };
            return updated;
          });
        }

        addLog('warning', `Parent PID ${pid} exiting → ${orphanChildren.length} children become ORPHAN`, pid);
        orphanChildren.forEach(c => {
          addLog('info', `PID ${c.pid} adopted by init (PID 1)`, c.pid);
        });
      }
    }

    const parent = findInTree(node.ppid);
    const newState: ProcessState = parent?.state === 'waiting' ? 'terminated' : 'zombie';

    const updateTree = (tree: ProcessNode): ProcessNode => {
      let updated = updateNode(tree, pid, (n) => ({
        ...n,
        state: newState,
        children: [], // Children already moved to init
      }));

      // If parent was waiting, set it back to running
      if (parent?.state === 'waiting') {
        const remainingRunning = parent.children.filter(
          c => c.pid !== pid && c.state === 'running'
        );
        if (remainingRunning.length === 0) {
          updated = updateNode(updated, parent.pid, (n) => ({
            ...n,
            state: 'running' as ProcessState,
          }));
        }
      }

      return updated;
    };

    if (initProcess) {
      setInitProcess(prev => prev ? updateTree(prev) : prev);
    }
    setRoot(prev => prev ? updateTree(prev) : prev);

    if (newState === 'zombie') {
      addLog('warning', `exit() called by PID ${pid} → Became ZOMBIE (parent not waiting)`, pid);
    } else {
      addLog('success', `exit() called by PID ${pid} → Terminated normally`, pid);
    }
  }, [root, initProcess, findInTree, updateNode, addLog]);

  const killProcess = useCallback((pid: number) => {
    if (!root) return;
    if (root.pid === pid) {
      setRoot(null);
      setInitProcess(null);
      setSelectedNode(null);
      setLogs([]);
      addLog('info', 'All processes terminated');
      return;
    }

    const node = findInTree(pid);
    if (!node) {
      addLog('error', `Process ${pid} not found`);
      return;
    }

    // Remove the node from its parent
    const removeNode = (tree: ProcessNode): ProcessNode => ({
      ...tree,
      children: tree.children.filter(c => c.pid !== pid).map(removeNode),
    });

    if (initProcess) {
      setInitProcess(prev => prev ? removeNode(prev) : prev);
    }
    setRoot(prev => prev ? removeNode(prev) : prev);

    addLog('error', `Process ${pid} killed`, pid);
  }, [root, initProcess, findInTree, addLog]);

  const resetTree = useCallback(() => {
    pidCounter = 1000;
    logIdCounter = 0;
    setRoot(null);
    setInitProcess(null);
    setSelectedNode(null);
    setLogs([]);
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
    setSelectedNode,
    createRootProcess,
    forkProcess,
    waitProcess,
    exitProcess,
    killProcess,
    resetTree,
    findNode: findInTree,
    getAllNodes,
    addLog,
  };
};
