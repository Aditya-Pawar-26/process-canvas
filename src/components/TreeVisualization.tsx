import { ProcessNode } from '@/types/process';
import { ProcessNodeCard } from './ProcessNodeCard';
import { useMemo } from 'react';

interface TreeVisualizationProps {
  root: ProcessNode | null;
  selectedNode: ProcessNode | null;
  highlightedNodeId?: string | null;
  executionPathPids?: Set<number>;
  executedPids?: Set<number>;
  isScopedExecution?: boolean;
  onSelectNode: (node: ProcessNode) => void;
  onFork: (pid: number) => void;
  onWait: (pid: number) => void;
  onExit: (pid: number) => void;
}

interface NodePosition {
  node: ProcessNode;
  x: number;
  y: number;
}

const NODE_WIDTH = 130;
const NODE_HEIGHT = 90;
const HORIZONTAL_SPACING = 40;
const VERTICAL_SPACING = 80;

export const TreeVisualization = ({
  root,
  selectedNode,
  highlightedNodeId,
  executionPathPids,
  executedPids,
  isScopedExecution = false,
  onSelectNode,
  onFork,
  onWait,
  onExit,
}: TreeVisualizationProps) => {

  // Determine if a node should be dimmed (outside execution path)
  const shouldDimNode = (node: ProcessNode): boolean => {
    if (!isScopedExecution || !executionPathPids) return false;
    return !executionPathPids.has(node.pid);
  };

  // Determine if a node has been executed in scoped mode
  const isNodeExecuted = (node: ProcessNode): boolean => {
    if (!isScopedExecution || !executedPids) return false;
    return executedPids.has(node.pid);
  };

  // Calculate positions using Reingold-Tilford style algorithm
  const positions = useMemo(() => {
    if (!root) return [];

    // First pass: calculate subtree widths
    const subtreeWidths = new Map<string, number>();
    
    function calculateSubtreeWidth(node: ProcessNode): number {
      if (node.children.length === 0) {
        subtreeWidths.set(node.id, NODE_WIDTH);
        return NODE_WIDTH;
      }
      
      const childrenWidth = node.children.reduce((sum, child, index) => {
        const width = calculateSubtreeWidth(child);
        return sum + width + (index > 0 ? HORIZONTAL_SPACING : 0);
      }, 0);
      
      const totalWidth = Math.max(NODE_WIDTH, childrenWidth);
      subtreeWidths.set(node.id, totalWidth);
      return totalWidth;
    }
    
    calculateSubtreeWidth(root);
    
    // Second pass: assign positions
    const positionList: NodePosition[] = [];
    
    function assignPositions(
      node: ProcessNode,
      depth: number,
      leftBound: number
    ): number {
      const subtreeWidth = subtreeWidths.get(node.id) || NODE_WIDTH;
      const y = depth * (NODE_HEIGHT + VERTICAL_SPACING);
      
      if (node.children.length === 0) {
        positionList.push({ node, x: leftBound, y });
        return subtreeWidth;
      }
      
      // Position children first
      let currentLeft = leftBound;
      const childPositions: { x: number; width: number }[] = [];
      
      for (const child of node.children) {
        const childWidth = assignPositions(child, depth + 1, currentLeft);
        const childPos = positionList.find(p => p.node.id === child.id);
        if (childPos) {
          childPositions.push({ x: childPos.x, width: childWidth });
        }
        currentLeft += childWidth + HORIZONTAL_SPACING;
      }
      
      // Center parent over children
      if (childPositions.length > 0) {
        const firstChild = childPositions[0];
        const lastChild = childPositions[childPositions.length - 1];
        const childSpanCenter = (firstChild.x + lastChild.x + NODE_WIDTH) / 2;
        const nodeX = childSpanCenter - NODE_WIDTH / 2;
        positionList.push({ node, x: nodeX, y });
      } else {
        positionList.push({ node, x: leftBound + subtreeWidth / 2 - NODE_WIDTH / 2, y });
      }
      
      return subtreeWidth;
    }
    
    assignPositions(root, 0, 50);
    
    return positionList;
  }, [root]);

  // Calculate edges
  const edges = useMemo(() => {
    if (!root || positions.length === 0) return [];
    
    const edgeList: { from: NodePosition; to: NodePosition }[] = [];
    const positionMap = new Map(positions.map(p => [p.node.id, p]));
    
    for (const pos of positions) {
      for (const child of pos.node.children) {
        const childPos = positionMap.get(child.id);
        if (childPos) {
          edgeList.push({ from: pos, to: childPos });
        }
      }
    }
    
    return edgeList;
  }, [root, positions]);

  if (!root) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">No process tree</p>
          <p className="text-sm">Click "Fork Process" to create the root process</p>
        </div>
      </div>
    );
  }

  const maxX = positions.length > 0 ? Math.max(...positions.map(p => p.x)) + NODE_WIDTH + 50 : 400;
  const maxY = positions.length > 0 ? Math.max(...positions.map(p => p.y)) + NODE_HEIGHT + 50 : 300;

  return (
    <div className="relative w-full h-full overflow-auto">
      <div 
        className="relative"
        style={{ minWidth: maxX, minHeight: maxY }}
      >
        {/* SVG for edges - center to center connections */}
        <svg 
          className="absolute inset-0 pointer-events-none"
          style={{ width: maxX, height: maxY }}
        >
          {edges.map((edge, i) => {
            // Calculate center points
            const x1 = edge.from.x + NODE_WIDTH / 2;
            const y1 = edge.from.y + NODE_HEIGHT;
            const x2 = edge.to.x + NODE_WIDTH / 2;
            const y2 = edge.to.y;

            // Smooth bezier curve from bottom-center of parent to top-center of child
            const midY = (y1 + y2) / 2;

            // Dim edges for nodes outside execution path
            const isEdgeDimmed = shouldDimNode(edge.from.node) || shouldDimNode(edge.to.node);

            return (
              <path
                key={i}
                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeOpacity={isEdgeDimmed ? 0.15 : 0.6}
                className="transition-all duration-300"
              />
            );
          })}
        </svg>

        {/* Node cards */}
        {positions.map((pos) => {
          const isDimmed = shouldDimNode(pos.node);
          const isExecuted = isNodeExecuted(pos.node);
          
          return (
            <div
              key={pos.node.id}
              className={`absolute transition-all duration-500 ${isDimmed ? 'opacity-25 pointer-events-none' : ''}`}
              style={{ left: pos.x, top: pos.y }}
            >
              <ProcessNodeCard
                node={pos.node}
                isSelected={selectedNode?.id === pos.node.id}
                isHighlighted={highlightedNodeId === pos.node.id || isExecuted}
                isDimmed={isDimmed}
                isExecuted={isExecuted}
                onSelect={onSelectNode}
                onFork={onFork}
                onWait={onWait}
                onExit={onExit}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
