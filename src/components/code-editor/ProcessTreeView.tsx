import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skull, UserX } from 'lucide-react';
import { SimProcess } from '@/hooks/useCodeSimulator';

const getStateStyles = (state: SimProcess['state']) => {
  switch (state) {
    case 'running': return 'border-process-running bg-process-running/20 text-foreground';
    case 'waiting': return 'border-process-waiting bg-process-waiting/20 text-foreground';
    case 'zombie': return 'border-process-zombie bg-process-zombie/20 border-dashed';
    case 'orphan': return 'border-process-orphan bg-process-orphan/20 border-dashed';
    case 'terminated': return 'border-muted bg-muted/20 opacity-50';
    default: return 'border-border';
  }
};

const stateLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  running: { label: 'Running', icon: null },
  waiting: { label: 'Waiting', icon: null },
  zombie: { label: 'Zombie', icon: <Skull className="w-3 h-3" /> },
  orphan: { label: 'Orphan', icon: <UserX className="w-3 h-3" /> },
  terminated: { label: 'Exited', icon: null },
};

const stateTooltips: Record<string, string> = {
  running: 'Process is actively executing.',
  waiting: 'Blocked on wait() until a child exits.',
  zombie: 'Process terminated but parent hasn\'t called wait(). Exit status not collected.',
  orphan: 'Parent exited. Process adopted by init (PID 1). Still running.',
  terminated: 'Process has cleanly exited.',
};

const renderTree = (procs: SimProcess[], depth = 0): JSX.Element[] => {
  return procs.map((proc) => {
    const info = stateLabels[proc.state] || { label: proc.state, icon: null };
    const visibleChildren = proc.children.filter(c => c.state !== 'terminated');

    return (
      <div key={proc.pid} className="flex flex-col items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`rounded-lg border-2 p-3 text-center transition-all duration-300 min-w-[110px] cursor-help ${getStateStyles(proc.state)}`}>
              <div className="font-mono text-sm font-bold">PID {proc.pid}</div>
              <div className="text-xs text-muted-foreground">PPID: {proc.ppid}</div>
              <Badge
                variant="outline"
                className={`text-xs mt-1 gap-1 ${
                  proc.state === 'zombie' ? 'border-process-zombie text-process-zombie' :
                  proc.state === 'orphan' ? 'border-process-orphan text-process-orphan' : ''
                }`}
              >
                {info.icon}
                {info.label}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[250px]">
            <p>{stateTooltips[proc.state]}</p>
          </TooltipContent>
        </Tooltip>

        {visibleChildren.length > 0 && (
          <>
            <div className="w-px h-4 bg-primary/40" />
            <div className="flex gap-3">
              {renderTree(visibleChildren, depth + 1)}
            </div>
          </>
        )}
      </div>
    );
  });
};

interface Props {
  processes: SimProcess[];
}

export const ProcessTreeView: React.FC<Props> = ({ processes }) => (
  <Card className="bg-card border-border">
    <CardHeader className="pb-3">
      <CardTitle className="text-base">Process Tree</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="min-h-[250px] flex items-center justify-center">
        {processes.length === 0 ? (
          <div className="text-center text-muted-foreground">
            <p>Click "Run" or "Step" to start simulation</p>
            <p className="text-xs mt-1">Shortcuts: Space (play/pause), N (step), R (reset)</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {renderTree(processes)}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);
