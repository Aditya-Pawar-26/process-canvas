import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle2, Circle, Target, Play } from 'lucide-react';

interface ExecutionTimelineProps {
  executionPath: number[];
  executedPids: Set<number>;
  currentExecutingPid: number | null;
  logicalTime: number;
  executionComplete: boolean;
  boundaryPid: number | null;
  isAutoPlaying?: boolean;
}

export const ExecutionTimeline = ({
  executionPath,
  executedPids,
  currentExecutingPid,
  logicalTime,
  executionComplete,
  boundaryPid,
  isAutoPlaying = false,
}: ExecutionTimelineProps) => {
  if (executionPath.length === 0) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Execution Timeline</span>
        {isAutoPlaying && (
          <Badge variant="secondary" className="text-xs gap-1">
            <Play className="w-3 h-3" />
            Auto
          </Badge>
        )}
        <Badge variant="outline" className="ml-auto font-mono text-xs">
          t = {logicalTime} / {executionPath.length}
        </Badge>
      </div>
      
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {executionPath.map((pid, index) => {
          const stepTime = index + 1;
          const isExecuted = executedPids.has(pid);
          const isCurrent = pid === currentExecutingPid;
          const isPending = !isExecuted;
          const isBoundary = pid === boundaryPid;
          
          return (
            <div key={pid} className="flex items-center">
              {/* Step node */}
              <div
                className={cn(
                  'flex flex-col items-center min-w-[70px] p-2 rounded-lg transition-all duration-300',
                  isCurrent && 'bg-process-running/20 scale-105 ring-2 ring-process-running',
                  isExecuted && !isCurrent && 'bg-muted/50',
                  isPending && 'opacity-50'
                )}
              >
                {/* Time indicator */}
                <div className={cn(
                  'text-xs font-mono mb-1',
                  isCurrent ? 'text-process-running font-bold' : 'text-muted-foreground'
                )}>
                  t={stepTime}
                </div>
                
                {/* Status icon + PID */}
                <div className="flex items-center gap-1">
                  {isCurrent ? (
                    <div className="w-3 h-3 bg-process-running rounded-full animate-pulse" />
                  ) : isExecuted ? (
                    <CheckCircle2 className="w-3 h-3 text-process-running" />
                  ) : (
                    <Circle className="w-3 h-3 text-muted-foreground" />
                  )}
                  <span className={cn(
                    'font-mono text-sm font-bold',
                    isCurrent ? 'text-process-running' : isExecuted ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {pid}
                  </span>
                  {isBoundary && (
                    <Target className="w-3 h-3 text-primary ml-0.5" />
                  )}
                </div>
                
                {/* Status label */}
                <div className={cn(
                  'text-[10px] mt-1',
                  isCurrent ? 'text-process-running' : 'text-muted-foreground'
                )}>
                  {isCurrent ? 'EXECUTING' : isExecuted ? 'done' : 'pending'}
                </div>
              </div>
              
              {/* Arrow connector (except after last) */}
              {index < executionPath.length - 1 && (
                <div className={cn(
                  'w-6 h-0.5 mx-1',
                  isExecuted ? 'bg-process-running' : 'bg-muted-foreground/30'
                )} />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Completion message */}
      {executionComplete && (
        <div className="mt-2 flex items-center gap-2 text-sm text-process-running">
          <CheckCircle2 className="w-4 h-4" />
          <span>Execution complete - boundary PID {boundaryPid} reached</span>
        </div>
      )}
      
      {/* Legend */}
      <div className="mt-3 pt-2 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-process-running rounded-full animate-pulse" />
          <span>Currently executing</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-process-running" />
          <span>Executed</span>
        </div>
        <div className="flex items-center gap-1">
          <Circle className="w-3 h-3" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1">
          <Target className="w-3 h-3 text-primary" />
          <span>Boundary</span>
        </div>
      </div>
    </div>
  );
};
