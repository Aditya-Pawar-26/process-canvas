import { ProcessNode } from '@/types/process';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Info, Cpu, GitBranch, Clock } from 'lucide-react';

interface InfoPanelProps {
  selectedNode: ProcessNode | null;
  lastAction?: string;
  osExplanation?: string;
  dsaExplanation?: string;
}

export const InfoPanel = ({
  selectedNode,
  lastAction,
  osExplanation,
  dsaExplanation,
}: InfoPanelProps) => {
  if (!selectedNode) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info className="w-4 h-4" />
          <span className="text-sm">Select a process to view details</span>
        </div>
      </div>
    );
  }

  const stateColors = {
    running: 'bg-process-running/20 text-process-running border-process-running',
    waiting: 'bg-process-waiting/20 text-process-waiting border-process-waiting',
    zombie: 'bg-process-zombie/20 text-process-zombie border-process-zombie',
    terminated: 'bg-muted text-muted-foreground border-muted',
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-primary" />
          Process Details
        </h3>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">PID</span>
            <span className="font-mono text-sm">{selectedNode.pid}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">PPID</span>
            <span className="font-mono text-sm">{selectedNode.ppid}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Depth</span>
            <span className="font-mono text-sm">{selectedNode.depth}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Children</span>
            <span className="font-mono text-sm">{selectedNode.children.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">State</span>
            <Badge variant="outline" className={stateColors[selectedNode.state]}>
              {selectedNode.state}
            </Badge>
          </div>
        </div>
      </div>

      {(lastAction || osExplanation || dsaExplanation) && (
        <>
          <Separator className="bg-border" />

          <div className="space-y-3">
            {lastAction && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Last Action</span>
                </div>
                <p className="text-sm">{lastAction}</p>
              </div>
            )}

            {osExplanation && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="w-3 h-3 text-process-running" />
                  <span className="text-xs font-medium text-muted-foreground">OS Concept</span>
                </div>
                <p className="text-sm text-muted-foreground">{osExplanation}</p>
              </div>
            )}

            {dsaExplanation && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <GitBranch className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">DSA Concept</span>
                </div>
                <p className="text-sm text-muted-foreground">{dsaExplanation}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
