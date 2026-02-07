import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { ProcessNode, LogEntry } from '@/types/process';
import { useProcessTree } from '@/hooks/useProcessTree';

// Types for execution history (for Gantt Chart)
export interface ExecutionEvent {
  id: string;
  pid: number;
  action: 'fork' | 'wait' | 'exit' | 'resume' | 'created';
  startTime: number;
  endTime?: number;
  state: 'running' | 'waiting' | 'zombie' | 'orphan' | 'terminated';
  parentPid?: number;
}

interface ProcessTreeContextType {
  // Process tree state
  root: ProcessNode | null;
  initProcess: ProcessNode | null;
  logs: LogEntry[];
  selectedNode: ProcessNode | null;
  forkCount: number;
  executionMode: 'full' | 'until-selected';
  executionBoundaryPid: number | null;
  executedPids: Set<number>;
  executionComplete: boolean;
  currentExecutingPid: number | null;
  logicalTime: number;
  executionPath: number[];
  
  // Auto-play state (shared)
  isAutoPlaying: boolean;
  speed: number;
  globalLogicalTime: number;
  executionHistory: ExecutionEvent[];
  
  // Actions
  setSelectedNode: (node: ProcessNode | null) => void;
  setExecutionMode: (mode: 'full' | 'until-selected') => void;
  createRootProcess: () => ProcessNode;
  forkProcess: (parentPid: number) => ProcessNode | null;
  forkAllProcesses: () => ProcessNode[];
  waitProcess: (parentPid: number) => void;
  exitProcess: (pid: number) => void;
  resetTree: () => void;
  findNode: (pid: number) => ProcessNode | null;
  getAllNodes: (node: ProcessNode | null) => ProcessNode[];
  getAllRunningProcesses: (node: ProcessNode | null) => ProcessNode[];
  addLog: (type: LogEntry['type'], message: string, pid?: number) => void;
  getAncestorChain: (targetPid: number) => number[];
  isInExecutionPath: (pid: number) => boolean;
  startScopedExecution: (targetPid: number) => void;
  executeNextScopedStep: () => ProcessNode | null;
  resetScopedExecution: () => void;
  
  // Shared control actions
  setIsAutoPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  recordExecution: (pid: number, action: ExecutionEvent['action'], state: ExecutionEvent['state'], parentPid?: number) => void;
  incrementGlobalTime: () => void;
  resetExecutionHistory: () => void;
}

const ProcessTreeContext = createContext<ProcessTreeContextType | null>(null);

export const useProcessTreeContext = () => {
  const context = useContext(ProcessTreeContext);
  if (!context) {
    throw new Error('useProcessTreeContext must be used within a ProcessTreeProvider');
  }
  return context;
};

interface ProcessTreeProviderProps {
  children: ReactNode;
}

export const ProcessTreeProvider = ({ children }: ProcessTreeProviderProps) => {
  const processTree = useProcessTree();
  
  // Shared auto-play state
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [globalLogicalTime, setGlobalLogicalTime] = useState(0);
  const [executionHistory, setExecutionHistory] = useState<ExecutionEvent[]>([]);
  
  // Record an execution event for the Gantt chart
  const recordExecution = useCallback((
    pid: number, 
    action: ExecutionEvent['action'], 
    state: ExecutionEvent['state'],
    parentPid?: number
  ) => {
    setExecutionHistory(prev => {
      // Check if there's an existing open event for this PID
      const existingIndex = prev.findIndex(e => e.pid === pid && !e.endTime);
      
      if (existingIndex >= 0 && (action === 'exit' || action === 'wait')) {
        // Close the existing event
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          endTime: globalLogicalTime,
          state,
        };
        return updated;
      }
      
      // Add new event
      const newEvent: ExecutionEvent = {
        id: `${pid}-${action}-${globalLogicalTime}`,
        pid,
        action,
        startTime: globalLogicalTime,
        state,
        parentPid,
      };
      
      return [...prev, newEvent];
    });
  }, [globalLogicalTime]);
  
  const incrementGlobalTime = useCallback(() => {
    setGlobalLogicalTime(prev => prev + 1);
  }, []);
  
  const resetExecutionHistory = useCallback(() => {
    setExecutionHistory([]);
    setGlobalLogicalTime(0);
    setIsAutoPlaying(false);
  }, []);
  
  // Wrap reset to also clear execution history
  const wrappedResetTree = useCallback(() => {
    processTree.resetTree();
    resetExecutionHistory();
  }, [processTree, resetExecutionHistory]);
  
  const value = useMemo<ProcessTreeContextType>(() => ({
    // From useProcessTree
    root: processTree.root,
    initProcess: processTree.initProcess,
    logs: processTree.logs,
    selectedNode: processTree.selectedNode,
    forkCount: processTree.forkCount,
    executionMode: processTree.executionMode,
    executionBoundaryPid: processTree.executionBoundaryPid,
    executedPids: processTree.executedPids,
    executionComplete: processTree.executionComplete,
    currentExecutingPid: processTree.currentExecutingPid,
    logicalTime: processTree.logicalTime,
    executionPath: processTree.executionPath,
    
    // Shared auto-play state
    isAutoPlaying,
    speed,
    globalLogicalTime,
    executionHistory,
    
    // Actions from useProcessTree
    setSelectedNode: processTree.setSelectedNode,
    setExecutionMode: processTree.setExecutionMode,
    createRootProcess: processTree.createRootProcess,
    forkProcess: processTree.forkProcess,
    forkAllProcesses: processTree.forkAllProcesses,
    waitProcess: processTree.waitProcess,
    exitProcess: processTree.exitProcess,
    resetTree: wrappedResetTree,
    findNode: processTree.findNode,
    getAllNodes: processTree.getAllNodes,
    getAllRunningProcesses: processTree.getAllRunningProcesses,
    addLog: processTree.addLog,
    getAncestorChain: processTree.getAncestorChain,
    isInExecutionPath: processTree.isInExecutionPath,
    startScopedExecution: processTree.startScopedExecution,
    executeNextScopedStep: processTree.executeNextScopedStep,
    resetScopedExecution: processTree.resetScopedExecution,
    
    // Shared control actions
    setIsAutoPlaying,
    setSpeed,
    recordExecution,
    incrementGlobalTime,
    resetExecutionHistory,
  }), [
    processTree,
    isAutoPlaying,
    speed,
    globalLogicalTime,
    executionHistory,
    wrappedResetTree,
    recordExecution,
    incrementGlobalTime,
    resetExecutionHistory,
  ]);
  
  return (
    <ProcessTreeContext.Provider value={value}>
      {children}
    </ProcessTreeContext.Provider>
  );
};
