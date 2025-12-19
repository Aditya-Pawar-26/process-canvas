import { LogEntry } from '@/types/process';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

interface ConsoleLogProps {
  logs: LogEntry[];
}

export const ConsoleLog = ({ logs }: ConsoleLogProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-secondary/30">
        <Terminal className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Console Output</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {logs.length} entries
        </span>
      </div>
      
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
