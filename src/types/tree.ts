// Unified tree node interface for both OS and DSA trees
export interface UnifiedTreeNode {
  id: string;
  value: number | string;
  parentId: string | null;
  children: UnifiedTreeNode[];
  depth: number;
  
  // Optional OS-specific properties
  state?: 'running' | 'waiting' | 'zombie' | 'orphan' | 'terminated';
  ppid?: number;
}

export interface NodePosition {
  node: UnifiedTreeNode;
  x: number;
  y: number;
}

export interface TreeEdge {
  from: NodePosition;
  to: NodePosition;
}

export interface TreeLayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
}

// Calculate positions using Reingold-Tilford style algorithm
export function calculateTreeLayout(
  root: UnifiedTreeNode | null,
  config: TreeLayoutConfig
): NodePosition[] {
  if (!root) return [];

  const { nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing } = config;
  
  // First pass: calculate subtree widths
  const subtreeWidths = new Map<string, number>();
  
  function calculateSubtreeWidth(node: UnifiedTreeNode): number {
    if (node.children.length === 0) {
      subtreeWidths.set(node.id, nodeWidth);
      return nodeWidth;
    }
    
    const childrenWidth = node.children.reduce((sum, child, index) => {
      const width = calculateSubtreeWidth(child);
      return sum + width + (index > 0 ? horizontalSpacing : 0);
    }, 0);
    
    const totalWidth = Math.max(nodeWidth, childrenWidth);
    subtreeWidths.set(node.id, totalWidth);
    return totalWidth;
  }
  
  calculateSubtreeWidth(root);
  
  // Second pass: assign positions
  const positions: NodePosition[] = [];
  
  function assignPositions(
    node: UnifiedTreeNode,
    depth: number,
    leftBound: number
  ): number {
    const subtreeWidth = subtreeWidths.get(node.id) || nodeWidth;
    const y = depth * (nodeHeight + verticalSpacing);
    
    if (node.children.length === 0) {
      positions.push({ node, x: leftBound, y });
      return subtreeWidth;
    }
    
    // Position children first
    let currentLeft = leftBound;
    const childPositions: { x: number; width: number }[] = [];
    
    for (const child of node.children) {
      const childWidth = assignPositions(child, depth + 1, currentLeft);
      const childPos = positions.find(p => p.node.id === child.id);
      if (childPos) {
        childPositions.push({ x: childPos.x, width: childWidth });
      }
      currentLeft += childWidth + horizontalSpacing;
    }
    
    // Center parent over children
    if (childPositions.length > 0) {
      const firstChild = childPositions[0];
      const lastChild = childPositions[childPositions.length - 1];
      const childSpanCenter = (firstChild.x + lastChild.x + nodeWidth) / 2;
      const nodeX = childSpanCenter - nodeWidth / 2;
      positions.push({ node, x: nodeX, y });
    } else {
      positions.push({ node, x: leftBound + subtreeWidth / 2 - nodeWidth / 2, y });
    }
    
    return subtreeWidth;
  }
  
  assignPositions(root, 0, 50);
  
  return positions;
}

// Calculate edges from positions
export function calculateEdges(
  positions: NodePosition[],
  nodeWidth: number,
  nodeHeight: number
): TreeEdge[] {
  const edges: TreeEdge[] = [];
  const positionMap = new Map(positions.map(p => [p.node.id, p]));
  
  for (const pos of positions) {
    for (const child of pos.node.children) {
      const childPos = positionMap.get(child.id);
      if (childPos) {
        edges.push({ from: pos, to: childPos });
      }
    }
  }
  
  return edges;
}
