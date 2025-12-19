import { ProcessNode } from '@/types/process';
import { ProcessNodeCard } from './ProcessNodeCard';
import { useEffect, useRef, useState } from 'react';

interface TreeVisualizationProps {
  root: ProcessNode | null;
  selectedNode: ProcessNode | null;
  highlightedNodeId?: string | null;
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

export const TreeVisualization = ({
  root,
  selectedNode,
  highlightedNodeId,
  onSelectNode,
  onFork,
  onWait,
  onExit,
}: TreeVisualizationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<NodePosition[]>([]);

  const NODE_WIDTH = 130;
  const NODE_HEIGHT = 90;
  const HORIZONTAL_SPACING = 40;
  const VERTICAL_SPACING = 80;

  useEffect(() => {
    if (!root) {
      setPositions([]);
      return;
    }

    const calculatePositions = (
      node: ProcessNode,
      depth: number,
      leftBound: number
    ): { positions: NodePosition[]; width: number } => {
      if (node.children.length === 0) {
        return {
          positions: [{ node, x: leftBound, y: depth * (NODE_HEIGHT + VERTICAL_SPACING) }],
          width: NODE_WIDTH,
        };
      }

      let childPositions: NodePosition[] = [];
      let currentLeft = leftBound;
      let totalWidth = 0;

      for (const child of node.children) {
        const result = calculatePositions(child, depth + 1, currentLeft);
        childPositions = [...childPositions, ...result.positions];
        currentLeft += result.width + HORIZONTAL_SPACING;
        totalWidth += result.width + HORIZONTAL_SPACING;
      }

      totalWidth -= HORIZONTAL_SPACING;

      const nodeX = leftBound + totalWidth / 2 - NODE_WIDTH / 2;
      const nodeY = depth * (NODE_HEIGHT + VERTICAL_SPACING);

      return {
        positions: [{ node, x: nodeX, y: nodeY }, ...childPositions],
        width: Math.max(totalWidth, NODE_WIDTH),
      };
    };

    const result = calculatePositions(root, 0, 50);
    setPositions(result.positions);
  }, [root]);

  const getEdges = () => {
    if (!root) return [];
    
    const edges: { from: NodePosition; to: NodePosition }[] = [];
    
    const traverse = (node: ProcessNode) => {
      const parentPos = positions.find(p => p.node.id === node.id);
      if (!parentPos) return;

      for (const child of node.children) {
        const childPos = positions.find(p => p.node.id === child.id);
        if (childPos) {
          edges.push({ from: parentPos, to: childPos });
        }
        traverse(child);
      }
    };

    traverse(root);
    return edges;
  };

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

  const edges = getEdges();
  const maxX = Math.max(...positions.map(p => p.x)) + NODE_WIDTH + 50;
  const maxY = Math.max(...positions.map(p => p.y)) + NODE_HEIGHT + 50;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-auto"
    >
      <div 
        className="relative"
        style={{ minWidth: maxX, minHeight: maxY }}
      >
        {/* SVG for edges */}
        <svg 
          className="absolute inset-0 pointer-events-none"
          style={{ width: maxX, height: maxY }}
        >
          {edges.map((edge, i) => {
            const x1 = edge.from.x + NODE_WIDTH / 2;
            const y1 = edge.from.y + NODE_HEIGHT;
            const x2 = edge.to.x + NODE_WIDTH / 2;
            const y2 = edge.to.y;

            return (
              <path
                key={i}
                d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeOpacity="0.5"
                className="animate-draw-line"
                style={{ strokeDasharray: 1000, strokeDashoffset: 0 }}
              />
            );
          })}
        </svg>

        {/* Node cards */}
        {positions.map((pos) => (
          <div
            key={pos.node.id}
            className="absolute transition-all duration-500"
            style={{ left: pos.x, top: pos.y }}
          >
            <ProcessNodeCard
              node={pos.node}
              isSelected={selectedNode?.id === pos.node.id}
              isHighlighted={highlightedNodeId === pos.node.id}
              onSelect={onSelectNode}
              onFork={onFork}
              onWait={onWait}
              onExit={onExit}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
