import { LogEntry, ProcessNode } from '@/types/process';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ConsoleLogProps {
  logs: LogEntry[];
  root?: ProcessNode | null;
  onExitProcess?: (pid: number) => void;
  selectedExitPid?: number | null;
  onSelectExitPid?: (pid: number | null) => void;
}

// Helper to collect all running processes from tree
const collectRunningProcesses = (node: ProcessNode | null): ProcessNode[] => {
  if (!node) return [];
  const result: ProcessNode[] = [];
  if (node.state === 'running' || node.state === 'orphan') {
    result.push(node);
  }
  for (const child of node.children) {
    result.push(...collectRunningProcesses(child));
  }
  return result;
};

export const ConsoleLog = ({ 
  logs, 
  root, 
  onExitProcess,
  selectedExitPid,
  onSelectExitPid 
}: ConsoleLogProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get all running processes for the selector
  const runningProcesses = useMemo(() => {
    return collectRunningProcesses(root ?? null);
  }, [root]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const logTypeStyles = {
    info: 'text-primary',
    success: 'text-process-running',
    warning: 'text-process-waiting',
    error: 'text-process-zombie',
  };

  const logTypePrefixes = {
    info: '[INFO]',
    success: '[OK]',
    warning: '[WAIT]',
    error: '[ERR]',
  };

  const handleFinishExecution = () => {
    if (selectedExitPid && onExitProcess) {
      onExitProcess(selectedExitPid);
      onSelectExitPid?.(null);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-secondary/30">
        <Terminal className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Console Output</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {logs.length} entries
        </span>
      </div>
      
      {/* Manual Process Exit Control */}
      {onExitProcess && runningProcesses.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground">Manual Exit:</span>
          <Select
            value={selectedExitPid?.toString() ?? ''}
            onValueChange={(v) => onSelectExitPid?.(v ? parseInt(v, 10) : null)}
          >
            <SelectTrigger className="w-[140px] h-7 text-xs">
              <SelectValue placeholder="Select PID..." />
            </SelectTrigger>
            <SelectContent>
              {runningProcesses.map((proc) => (
                <SelectItem key={proc.pid} value={proc.pid.toString()}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">PID {proc.pid}</span>
                    <span className="text-muted-foreground text-xs">
                      ({proc.state === 'orphan' ? 'orphan' : 'running'})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs gap-1"
            disabled={!selectedExitPid}
            onClick={handleFinishExecution}
          >
            <Power className="w-3 h-3" />
            Finish Execution
          </Button>
          <span className="text-xs text-muted-foreground ml-2">
            Triggers exit() with UNIX semantics
          </span>
        </div>
      )}
      
      <ScrollArea className="h-[150px]" ref={scrollRef}>
        <div className="p-3 font-mono text-xs space-y-1">
          {logs.length === 0 ? (
            <div className="text-muted-foreground">
              Waiting for process activity...
            </div>
          ) : (
            logs.map((log) => (
              <div 
                key={log.id}
                className={cn(
                  'flex gap-2 animate-fade-in',
                  logTypeStyles[log.type]
                )}
              >
                <span className="text-muted-foreground">{formatTime(log.timestamp)}</span>
                <span className="font-semibold">{logTypePrefixes[log.type]}</span>
                <span>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
