import { ProcessNode } from '@/types/process';
import { DSANode } from '@/hooks/useDSATree';
import { UnifiedTreeNode } from '@/types/tree';

// Convert OS Process Tree to DSA Tree Node
export function processTreeToDSATree(
  processNode: ProcessNode,
  depth: number = 0,
  parentId: string | null = null
): DSANode {
  const dsaNode: DSANode = {
    id: `pid-${processNode.pid}`,
    value: processNode.pid,
    children: [],
    depth,
    parentId,
  };
  
  dsaNode.children = processNode.children.map(child =>
    processTreeToDSATree(child, depth + 1, dsaNode.id)
  );
  
  return dsaNode;
}

// Convert OS Process Tree to Unified Tree Node (preserves OS state)
export function processTreeToUnifiedTree(
  processNode: ProcessNode,
  depth: number = 0,
  parentId: string | null = null
): UnifiedTreeNode {
  const unifiedNode: UnifiedTreeNode = {
    id: `pid-${processNode.pid}`,
    value: processNode.pid,
    children: [],
    depth,
    parentId,
    state: processNode.state,
    ppid: processNode.ppid,
  };
  
  unifiedNode.children = processNode.children.map(child =>
    processTreeToUnifiedTree(child, depth + 1, unifiedNode.id)
  );
  
  return unifiedNode;
}

// Convert DSA Tree to Unified Tree Node
export function dsaTreeToUnifiedTree(
  dsaNode: DSANode
): UnifiedTreeNode {
  return {
    id: dsaNode.id,
    value: dsaNode.value,
    children: dsaNode.children.map(dsaTreeToUnifiedTree),
    depth: dsaNode.depth,
    parentId: dsaNode.parentId,
  };
}

// Get tree statistics
export interface TreeStats {
  totalNodes: number;
  height: number;
  maxDegree: number;
  leafCount: number;
  internalNodes: number;
}

export function getTreeStats(root: UnifiedTreeNode | DSANode | null): TreeStats {
  if (!root) {
    return { totalNodes: 0, height: 0, maxDegree: 0, leafCount: 0, internalNodes: 0 };
  }
  
  let totalNodes = 0;
  let maxDegree = 0;
  let leafCount = 0;
  
  function traverse(node: UnifiedTreeNode | DSANode): number {
    totalNodes++;
    maxDegree = Math.max(maxDegree, node.children.length);
    
    if (node.children.length === 0) {
      leafCount++;
      return 0;
    }
    
    const childHeights = node.children.map(traverse);
    return 1 + Math.max(...childHeights);
  }
  
  const height = traverse(root);
  const internalNodes = totalNodes - leafCount;
  
  return { totalNodes, height, maxDegree, leafCount, internalNodes };
}

// OS Tree educational explanations
export const osTreeConcepts = {
  nodeMapping: {
    title: "Process → Node Mapping",
    description: "Each process in the OS tree maps directly to a node in the DSA tree. The PID becomes the node value.",
  },
  forkOperation: {
    title: "fork() → Add Child",
    description: "When a process calls fork(), it creates a child process. In DSA terms, this adds a new child node to the current node.",
  },
  degree: {
    title: "Process Children → Node Degree",
    description: "The number of child processes a parent has equals the degree of that node in the tree.",
  },
  traversal: {
    title: "Process Scheduling → Tree Traversal",
    description: "Different traversal orders (preorder, postorder, level-order) mirror how an OS might visit processes for scheduling or cleanup.",
  },
  orphanZombie: {
    title: "Orphan/Zombie → Special Node States",
    description: "Orphan and zombie processes are nodes with special states - orphans are re-parented to init (PID 1), zombies await parent's wait().",
  },
};
