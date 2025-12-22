import { ProcessNode } from '@/types/process';
import { cn } from '@/lib/utils';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GitFork, Clock, X, Eye, Skull, UserX } from 'lucide-react';

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
  // ✅ OS-ACCURATE STATE COLORS:
  // Zombie: RED/GRAY - Terminated but not reaped (entry in process table)
  // Orphan: ORANGE/YELLOW - RUNNING but parent exited (adopted by init)
  const stateColors = {
    running: 'border-process-running shadow-[0_0_15px_hsl(var(--process-running)/0.3)]',
    waiting: 'border-process-waiting shadow-[0_0_15px_hsl(var(--process-waiting)/0.3)]',
    zombie: 'border-process-zombie shadow-[0_0_15px_hsl(var(--process-zombie)/0.3)] opacity-70',
    orphan: 'border-process-orphan shadow-[0_0_15px_hsl(var(--process-orphan)/0.3)]',
    terminated: 'border-process-terminated opacity-50',
  };

  const stateLabels = {
    running: 'Running',
    waiting: 'Waiting',
    zombie: 'Zombie',
    orphan: 'Orphan',
    terminated: 'Terminated',
  };

  // ✅ OS-ACCURATE STATE DESCRIPTIONS
  const stateTooltips = {
    running: 'Process is actively executing or ready to run',
    waiting: 'Process is blocked, waiting for child to terminate',
    zombie: 'Process has TERMINATED but parent has not called wait() - entry remains in process table',
    orphan: 'Parent exited while this process was STILL RUNNING - adopted by init (PID 1)',
    terminated: 'Process has terminated and been reaped - removed from process table',
  };

  const stateBgColors = {
    running: 'bg-process-running/20 text-process-running',
    waiting: 'bg-process-waiting/20 text-process-waiting',
    zombie: 'bg-process-zombie/20 text-process-zombie',
    orphan: 'bg-process-orphan/20 text-process-orphan',
    terminated: 'bg-muted text-muted-foreground',
  };

  const stateIcons = {
    running: null,
    waiting: <Clock className="w-3 h-3" />,
    zombie: <Skull className="w-3 h-3" />,
    orphan: <UserX className="w-3 h-3" />,
    terminated: null,
  };

  // Orphans can still fork (they're running!), zombies cannot (they're terminated)
  const canFork = node.state === 'running' || node.state === 'orphan';
  const canWait = (node.state === 'running' || node.state === 'orphan') && node.children.length > 0;
  const canExit = node.state === 'running' || node.state === 'orphan';

  return (
    <TooltipProvider>
      <ContextMenu>
        <ContextMenuTrigger>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                onClick={() => onSelect(node)}
                className={cn(
                  'bg-card border-2 rounded-lg p-3 cursor-pointer transition-all duration-300 min-w-[120px]',
                  'hover:scale-105 animate-scale-in',
                  stateColors[node.state],
                  isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                  isHighlighted && 'animate-pulse-glow',
                  node.state === 'orphan' && 'border-dashed',
                  node.state === 'zombie' && 'border-dotted'
                )}
              >
                <div className="text-center">
                  <div className="font-mono text-lg font-bold text-foreground">
                    PID {node.pid}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    PPID {node.ppid}
                    {node.state === 'orphan' && <span className="ml-1 text-process-orphan">(init)</span>}
                  </div>
                  <div className={cn(
                    'mt-2 px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1',
                    stateBgColors[node.state]
                  )}>
                    {stateIcons[node.state]}
                    {stateLabels[node.state]}
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[250px] text-center">
              <p className="text-sm font-medium">{stateLabels[node.state]} Process</p>
              <p className="text-xs text-muted-foreground">{stateTooltips[node.state]}</p>
            </TooltipContent>
          </Tooltip>
        </ContextMenuTrigger>
        <ContextMenuContent className="bg-card border-border">
          <ContextMenuItem 
            onClick={() => onFork(node.pid)}
            disabled={!canFork}
            className="gap-2"
          >
            <GitFork className="w-4 h-4" />
            Fork Child
            {!canFork && <span className="text-xs text-muted-foreground ml-auto">(cannot fork)</span>}
          </ContextMenuItem>
          <ContextMenuItem 
            onClick={() => onWait(node.pid)}
            disabled={!canWait}
            className="gap-2"
          >
            <Clock className="w-4 h-4" />
            Wait for Children
          </ContextMenuItem>
          <ContextMenuItem 
            onClick={() => onExit(node.pid)}
            disabled={!canExit}
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
    </TooltipProvider>
  );
};
