import { ProcessNode } from '@/types/process';
import { cn } from '@/lib/utils';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { GitFork, Clock, X, Eye, UserX } from 'lucide-react';

interface ProcessNodeCardProps {
  node: ProcessNode;
  isSelected: boolean;
  isHighlighted?: boolean;
  onSelect: (node: ProcessNode) => void;
  onFork: (pid: number) => void;
  onWait: (pid: number) => void;
  onExit: (pid: number) => void;
}

export const ProcessNodeCard = ({
  node,
  isSelected,
  isHighlighted,
  onSelect,
  onFork,
  onWait,
  onExit,
}: ProcessNodeCardProps) => {
  const stateColors = {
    running: 'border-process-running shadow-[0_0_15px_hsl(var(--process-running)/0.3)]',
    waiting: 'border-process-waiting shadow-[0_0_15px_hsl(var(--process-waiting)/0.3)]',
    zombie: 'border-process-zombie shadow-[0_0_15px_hsl(var(--process-zombie)/0.3)]',
    orphan: 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
    terminated: 'border-process-terminated opacity-60',
  };

  const stateLabels = {
    running: 'Running',
    waiting: 'Waiting',
    zombie: 'Zombie',
    orphan: 'Orphan',
    terminated: 'Terminated',
  };

  const stateBgColors = {
    running: 'bg-process-running/20 text-process-running',
    waiting: 'bg-process-waiting/20 text-process-waiting',
    zombie: 'bg-process-zombie/20 text-process-zombie',
    orphan: 'bg-purple-500/20 text-purple-400',
    terminated: 'bg-muted text-muted-foreground',
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={() => onSelect(node)}
          className={cn(
            'bg-card border-2 rounded-lg p-3 cursor-pointer transition-all duration-300 min-w-[120px]',
            'hover:scale-105 animate-scale-in',
            stateColors[node.state],
            isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
            isHighlighted && 'animate-pulse-glow',
            node.isOrphan && 'border-dashed'
          )}
        >
          <div className="text-center">
            <div className="font-mono text-lg font-bold text-foreground">
              PID {node.pid}
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              PPID {node.ppid}
              {node.isOrphan && <span className="ml-1">(init)</span>}
            </div>
            <div className={cn(
              'mt-2 px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1',
              stateBgColors[node.state]
            )}>
              {node.state === 'orphan' && <UserX className="w-3 h-3" />}
              {stateLabels[node.state]}
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-card border-border">
        <ContextMenuItem 
          onClick={() => onFork(node.pid)}
          disabled={node.state !== 'running' && node.state !== 'orphan'}
          className="gap-2"
        >
          <GitFork className="w-4 h-4" />
          Fork Child
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={() => onWait(node.pid)}
          disabled={(node.state !== 'running' && node.state !== 'orphan') || node.children.length === 0}
          className="gap-2"
        >
          <Clock className="w-4 h-4" />
          Wait for Children
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={() => onExit(node.pid)}
          disabled={node.state !== 'running' && node.state !== 'orphan'}
          className="gap-2 text-destructive"
        >
          <X className="w-4 h-4" />
          Exit Process
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={() => onSelect(node)}
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          View Details
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
