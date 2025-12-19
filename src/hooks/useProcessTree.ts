import { useState, useCallback } from 'react';
import { ProcessNode, ProcessState, LogEntry } from '@/types/process';

let pidCounter = 1000;
let logIdCounter = 0;

const generatePid = () => ++pidCounter;
const generateLogId = () => `log-${++logIdCounter}`;

export const useProcessTree = () => {
  const [root, setRoot] = useState<ProcessNode | null>(null);
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
    const rootNode: ProcessNode = {
      id: `process-${generatePid()}`,
      pid: 1001,
      ppid: 0,
      state: 'running',
      children: [],
      createdAt: Date.now(),
      depth: 0,
    };
    setRoot(rootNode);
    setLogs([]);
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

    const parent = findNode(root, parentPid);
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

    setRoot(prev => {
      if (!prev) return prev;
      return updateNode(prev, parentPid, (n) => ({
        ...n,
        children: [...n.children, childNode],
      }));
    });

    addLog('success', `fork() called by PID ${parentPid} → Child PID ${childPid} created`, childPid);
    return childNode;
  }, [root, findNode, updateNode, addLog, createRootProcess]);

  const waitProcess = useCallback((parentPid: number) => {
    if (!root) return;

    const parent = findNode(root, parentPid);
    if (!parent) {
      addLog('error', `Process ${parentPid} not found`);
      return;
    }

    const runningChildren = parent.children.filter(c => c.state === 'running');
    if (runningChildren.length === 0) {
      addLog('warning', `No running children to wait for`, parentPid);
      return;
    }

    setRoot(prev => {
      if (!prev) return prev;
      return updateNode(prev, parentPid, (n) => ({
        ...n,
        state: 'waiting' as ProcessState,
      }));
    });

    addLog('info', `wait() called by PID ${parentPid} → Waiting for children`, parentPid);
  }, [root, findNode, updateNode, addLog]);

  const exitProcess = useCallback((pid: number) => {
    if (!root) return;

    const node = findNode(root, pid);
    if (!node) {
      addLog('error', `Process ${pid} not found`);
      return;
    }

    const parent = findNode(root, node.ppid);
    const newState: ProcessState = parent?.state === 'waiting' ? 'terminated' : 'zombie';

    setRoot(prev => {
      if (!prev) return prev;
      
      // Update the exiting process
      let updated = updateNode(prev, pid, (n) => ({
        ...n,
        state: newState,
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
    });

    if (newState === 'zombie') {
      addLog('warning', `exit() called by PID ${pid} → Became ZOMBIE (parent not waiting)`, pid);
    } else {
      addLog('success', `exit() called by PID ${pid} → Terminated normally`, pid);
    }
  }, [root, findNode, updateNode, addLog]);

  const killProcess = useCallback((pid: number) => {
    if (!root) return;
    if (root.pid === pid) {
      setRoot(null);
      setSelectedNode(null);
      setLogs([]);
      addLog('info', 'All processes terminated');
      return;
    }

    const node = findNode(root, pid);
    if (!node) {
      addLog('error', `Process ${pid} not found`);
      return;
    }

    // Remove the node from its parent
    setRoot(prev => {
      if (!prev) return prev;
      return updateNode(prev, node.ppid, (n) => ({
        ...n,
        children: n.children.filter(c => c.pid !== pid),
      }));
    });

    addLog('error', `Process ${pid} killed`, pid);
  }, [root, findNode, updateNode, addLog]);

  const resetTree = useCallback(() => {
    pidCounter = 1000;
    logIdCounter = 0;
    setRoot(null);
    setSelectedNode(null);
    setLogs([]);
    addLog('info', 'Tree reset');
  }, [addLog]);

  const getAllNodes = useCallback((node: ProcessNode | null): ProcessNode[] => {
    if (!node) return [];
    return [node, ...node.children.flatMap(c => getAllNodes(c))];
  }, []);

  return {
    root,
    logs,
    selectedNode,
    setSelectedNode,
    createRootProcess,
    forkProcess,
    waitProcess,
    exitProcess,
    killProcess,
    resetTree,
    findNode,
    getAllNodes,
    addLog,
  };
};
