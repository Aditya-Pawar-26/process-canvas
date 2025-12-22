export type ProcessState = 'running' | 'waiting' | 'zombie' | 'terminated' | 'orphan';

export interface ProcessNode {
  id: string;
  pid: number;
  ppid: number;
  state: ProcessState;
  children: ProcessNode[];
  createdAt: number;
  depth: number;
  forkLevel: number; // Indicates which fork() call created this process
  isOrphan?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  pid?: number;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  osConcept: string;
  dsaConcept: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  code: string;
  steps: ScenarioStep[];
}

export interface ScenarioStep {
  action: 'fork' | 'wait' | 'exit' | 'orphan' | 'explain';
  targetPid?: number;
  description: string;
  osExplanation: string;
  dsaExplanation: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  objective: string;
  expectedTree: string;
  timeLimit: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export type TraversalType = 'preorder' | 'postorder' | 'levelorder' | 'inorder';

export interface TraversalStep {
  nodeId: string;
  order: number;
}

// DSA Tree Node - simpler structure for DSA page
export interface DSANode {
  id: string;
  value: number;
  children: DSANode[];
  depth: number;
  parent?: DSANode;
}

// Code execution types
export interface ExecutionStep {
  line: number;
  code: string;
  explanation: string;
  action: 'fork' | 'wait' | 'exit' | 'print' | 'sleep' | 'none';
  effect?: () => void;
}
