import { useMemo, useCallback } from 'react';
import { UnifiedTreeNode, calculateTreeLayout, calculateEdges, TreeLayoutConfig } from '@/types/tree';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Ghost, UserX, Play, Pause, CheckCircle } from 'lucide-react';

interface UnifiedTreeVisualizationProps {
  root: UnifiedTreeNode | null;
  selectedNodeId: string | null;
  highlightedNodeId?: string | null;
  visitedNodeIds?: string[];
  currentVisitIndex?: number;
  onSelectNode: (node: UnifiedTreeNode) => void;
  showOSInfo?: boolean;
  config?: Partial<TreeLayoutConfig>;
}

const defaultConfig: TreeLayoutConfig = {
  nodeWidth: 64,
  nodeHeight: 64,
  horizontalSpacing: 32,
  verticalSpacing: 80,
};

const stateConfig = {
  running: {
    color: 'bg-process-running/20 border-process-running',
    icon: Play,
    label: 'Running',
  },
  waiting: {
    color: 'bg-process-waiting/20 border-process-waiting',
    icon: Pause,
    label: 'Waiting',
  },
  zombie: {
    color: 'bg-process-zombie/20 border-process-zombie border-dashed',
    icon: Ghost,
    label: 'Zombie',
  },
  orphan: {
    color: 'bg-process-orphan/20 border-process-orphan border-dashed',
    icon: UserX,
    label: 'Orphan',
  },
  terminated: {
    color: 'bg-muted/20 border-muted',
    icon: CheckCircle,
    label: 'Terminated',
  },
};

export const UnifiedTreeVisualization = ({
  root,
  selectedNodeId,
  highlightedNodeId,
  visitedNodeIds = [],
  currentVisitIndex = -1,
  onSelectNode,
  showOSInfo = false,
  config: customConfig,
}: UnifiedTreeVisualizationProps) => {
  const config = useMemo(() => ({ ...defaultConfig, ...customConfig }), [customConfig]);
  
  const positions = useMemo(() => calculateTreeLayout(root, config), [root, config]);
  
  const edges = useMemo(
    () => calculateEdges(positions, config.nodeWidth, config.nodeHeight),
    [positions, config.nodeWidth, config.nodeHeight]
  );
  
  const bounds = useMemo(() => {
    if (positions.length === 0) return { width: 400, height: 300 };
    const maxX = Math.max(...positions.map(p => p.x)) + config.nodeWidth + 50;
    const maxY = Math.max(...positions.map(p => p.y)) + config.nodeHeight + 50;
    return { width: maxX, height: maxY };
  }, [positions, config]);

  const renderEdges = useCallback(() => {
    return edges.map((edge, i) => {
      const x1 = edge.from.x + config.nodeWidth / 2;
      const y1 = edge.from.y + config.nodeHeight;
      const x2 = edge.to.x + config.nodeWidth / 2;
      const y2 = edge.to.y;
      
      // Calculate control points for smooth bezier curve
      const midY = (y1 + y2) / 2;
      
      return (
        <path
          key={i}
          d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeOpacity="0.6"
          className="transition-all duration-300"
        />
      );
    });
  }, [edges, config]);

  const renderNode = useCallback((pos: { node: UnifiedTreeNode; x: number; y: number }) => {
    const { node, x, y } = pos;
    const isSelected = selectedNodeId === node.id;
    const isHighlighted = highlightedNodeId === node.id;
    const visitIndex = visitedNodeIds.indexOf(node.id);
    const isVisited = visitIndex >= 0 && visitIndex <= currentVisitIndex;
    
    const state = node.state || 'running';
    const stateInfo = stateConfig[state];
    const StateIcon = stateInfo?.icon || Play;
    
    return (
      <TooltipProvider key={node.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onClick={() => onSelectNode(node)}
              className={cn(
                'absolute flex flex-col items-center justify-center cursor-pointer transition-all duration-300',
                'rounded-full border-2 font-mono font-bold',
                showOSInfo ? stateInfo?.color : 'bg-card border-border hover:border-primary/50',
                isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                isHighlighted && 'border-primary bg-primary/30 scale-110 shadow-[0_0_20px_hsl(var(--primary)/0.5)]',
                isVisited && !isHighlighted && 'border-process-running bg-process-running/20'
              )}
              style={{
                left: x,
                top: y,
                width: config.nodeWidth,
                height: config.nodeHeight,
              }}
            >
              <span className="text-lg">{node.value}</span>
              {showOSInfo && (
                <StateIcon className="w-3 h-3 mt-0.5 opacity-70" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-1 text-sm">
              <div className="font-semibold">
                {showOSInfo ? `PID: ${node.value}` : `Value: ${node.value}`}
              </div>
              {showOSInfo && node.ppid !== undefined && (
                <div>PPID: {node.ppid}</div>
              )}
              <div>Depth: {node.depth}</div>
              <div>Children: {node.children.length}</div>
              {showOSInfo && node.state && (
                <div>State: <Badge variant="outline" className="text-xs">{stateInfo?.label}</Badge></div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
        
        {isVisited && (
          <Badge
            variant="secondary"
            className="absolute text-xs font-mono"
            style={{ left: x + config.nodeWidth / 2 - 10, top: y + config.nodeHeight + 4 }}
          >
            {visitIndex + 1}
          </Badge>
        )}
      </TooltipProvider>
    );
  }, [selectedNodeId, highlightedNodeId, visitedNodeIds, currentVisitIndex, showOSInfo, config, onSelectNode]);

  if (!root) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">No tree to display</p>
          <p className="text-sm">Create a root node to start building your tree</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-auto">
      <div
        className="relative"
        style={{ minWidth: bounds.width, minHeight: bounds.height }}
      >
        {/* SVG edges layer */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: bounds.width, height: bounds.height }}
        >
          {renderEdges()}
        </svg>
        
        {/* Node cards layer */}
        {positions.map(renderNode)}
      </div>
    </div>
  );
};
