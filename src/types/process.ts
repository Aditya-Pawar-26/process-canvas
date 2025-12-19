export type ProcessState = 'running' | 'waiting' | 'zombie' | 'terminated';

export interface ProcessNode {
  id: string;
  pid: number;
  ppid: number;
  state: ProcessState;
  children: ProcessNode[];
  createdAt: number;
  depth: number;
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
  action: 'fork' | 'wait' | 'exit';
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

export type TraversalType = 'preorder' | 'postorder' | 'levelorder';

export interface TraversalStep {
  nodeId: string;
  order: number;
}
