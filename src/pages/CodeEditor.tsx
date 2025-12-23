import { useState, useEffect, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Play, RotateCcw, Pause, SkipForward, Code, Terminal, Info, Skull, UserX } from 'lucide-react';
import { useCodeSimulator, SimProcess } from '@/hooks/useCodeSimulator';

// Each template has DISTINCT code that produces DIFFERENT OS outcomes.
// Notes on presets:
// - We still parse ONLY fork()/wait()/exit()/sleep().
// - Presets can add simple execution hints via inline comments:
//     exit(0); // child   → only non-root processes execute this line
//     wait(NULL); // parent → only the root/ppid=1 process executes this line
const codeTemplates = [
  {
    id: 'single-fork',
    name: 'Single Fork',
    description: 'Just fork - both processes keep running (no zombie/orphan)',
    code: `#include <unistd.h>

int main() {
    fork();
    // Both parent and child continue running
    // No exit, no wait - all processes stay alive
}`,
  },
  {
    id: 'fork-wait-clean',
    name: 'Fork + Wait (Clean)',
    description: 'Child exits; parent waits & reaps → no zombie, no orphan',
    code: `#include <sys/wait.h>
#include <unistd.h>

int main() {
    fork();
    exit(0); // child: exits first
    wait(NULL); // parent: waits and reaps child
}`,
  },
  {
    id: 'zombie-demo',
    name: 'Zombie Process',
    description: 'Child exits; parent does NOT wait → zombie persists',
    code: `#include <unistd.h>

int main() {
    fork();
    exit(0); // child: exits
    sleep(1); // parent: does NOT call wait()
    // Child becomes zombie because parent didn't wait
}`,
  },
  {
    id: 'orphan-demo',
    name: 'Orphan Process',
    description: 'Parent exits first → child becomes orphan (adopted by init)',
    code: `#include <unistd.h>

int main() {
    fork();
    exit(0); // parent: exits first
    sleep(1); // child: continues running as orphan
}`,
  },
  {
    id: 'proper-cleanup',
    name: 'Proper Cleanup',
    description: 'fork → child exit → parent wait → clean',
    code: `#include <sys/wait.h>
#include <unistd.h>

int main() {
    fork();
    exit(0); // child: exits
    wait(NULL); // parent: reaps child
    // No zombie because parent waited
}`,
  },
  {
    id: 'double-fork',
    name: 'Double Fork',
    description: 'Two forks → 4 running processes (no zombie/orphan)',
    code: `#include <unistd.h>

int main() {
    fork();
    fork();
    // 4 processes: original, child1, child2, grandchild
    // All stay running - no exit calls
}`,
  },
  {
    id: 'triple-fork',
    name: 'Triple Fork',
    description: 'Three forks → 8 running processes (no zombie/orphan)',
    code: `#include <unistd.h>

int main() {
    fork();
    fork();
    fork();
    // 8 processes total - all stay running
}`,
  },
];

export default function CodeEditor() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>(codeTemplates[0].id);
  const [code, setCode] = useState(codeTemplates[0].code);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const {
    processes,
    statements,
    logs,
    stepCount,
    isComplete,
    initializeSimulation,
    executeStep,
    reset,
    getCurrentStatement,
    getProcessStats
  } = useCodeSimulator();

  const handleTemplateChange = (templateId: string) => {
    const template = codeTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setCode(template.code);
      reset();
      setIsPlaying(false);
    }
  };

  const handleRun = useCallback(() => {
    if (processes.length === 0) {
      initializeSimulation(code);
    }
    setIsPlaying(true);
  }, [processes.length, code, initializeSimulation]);

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleStep = useCallback(() => {
    if (processes.length === 0) {
      initializeSimulation(code);
      return;
    }
    executeStep();
  }, [processes.length, code, initializeSimulation, executeStep]);

  const handleReset = () => {
    reset();
    setIsPlaying(false);
  };

  // Auto-play effect
  useEffect(() => {
    if (isPlaying && !isComplete) {
      const timer = setTimeout(() => {
        executeStep();
      }, 800);
      return () => clearTimeout(timer);
    } else if (isComplete) {
      setIsPlaying(false);
    }
  }, [isPlaying, isComplete, executeStep, stepCount]);

  const currentStatement = getCurrentStatement();
  const currentLine = currentStatement?.lineNumber ?? -1;
  const stats = getProcessStats();

  const getStateStyles = (state: SimProcess['state']) => {
    switch (state) {
      case 'running':
        return 'border-process-running bg-process-running/20 text-foreground';
      case 'waiting':
        return 'border-process-waiting bg-process-waiting/20 text-foreground';
      case 'zombie':
        return 'border-process-zombie bg-process-zombie/20 border-dashed';
      case 'orphan':
        return 'border-process-orphan bg-process-orphan/20 border-dashed';
      case 'terminated':
        return 'border-muted bg-muted/20 opacity-50';
      default:
        return 'border-border';
    }
  };

  const getStateLabel = (state: SimProcess['state']) => {
    const labels: Record<string, { label: string; icon: React.ReactNode }> = {
      running: { label: 'Running', icon: null },
      waiting: { label: 'Waiting', icon: null },
      zombie: { label: 'Zombie', icon: <Skull className="w-3 h-3" /> },
      orphan: { label: 'Orphan', icon: <UserX className="w-3 h-3" /> },
      terminated: { label: 'Exited', icon: null }
    };
    return labels[state] || { label: state, icon: null };
  };

  const renderProcessTree = (procs: SimProcess[], depth: number = 0): JSX.Element[] => {
    return procs.map((proc) => {
      const stateInfo = getStateLabel(proc.state);
      
      return (
        <div key={proc.pid} className="flex flex-col items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`rounded-lg border-2 p-3 text-center transition-all duration-300 min-w-[110px] cursor-help ${getStateStyles(proc.state)}`}
              >
                <div className="font-mono text-sm font-bold">PID {proc.pid}</div>
                <div className="text-xs text-muted-foreground">PPID: {proc.ppid}</div>
                <Badge 
                  variant="outline" 
                  className={`text-xs mt-1 gap-1 ${
                    proc.state === 'zombie' ? 'border-process-zombie text-process-zombie' :
                    proc.state === 'orphan' ? 'border-process-orphan text-process-orphan' : ''
                  }`}
                >
                  {stateInfo.icon}
                  {stateInfo.label}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[250px]">
              {proc.state === 'zombie' && (
                <p>Process terminated but parent hasn't called wait(). Exit status not collected.</p>
              )}
              {proc.state === 'orphan' && (
                <p>Parent exited. Process adopted by init (PID 1). Still running.</p>
              )}
              {proc.state === 'running' && (
                <p>Process is actively executing.</p>
              )}
              {proc.state === 'waiting' && (
                <p>Blocked on wait() until child exits.</p>
              )}
              {proc.state === 'terminated' && (
                <p>Process has cleanly exited.</p>
              )}
            </TooltipContent>
          </Tooltip>
          
          {proc.children.filter(c => c.state !== 'terminated').length > 0 && (
            <>
              <div className="w-px h-4 bg-primary/40" />
              <div className="flex gap-3">
                {renderProcessTree(proc.children.filter(c => c.state !== 'terminated'), depth + 1)}
              </div>
            </>
          )}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container py-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Process Simulator</h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Info className="w-4 h-4" />
            This editor simulates OS behavior logically; it does not execute real C code.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Code Panel */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-primary" />
                  Code Editor
                </CardTitle>
                <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {codeTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div>
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-muted-foreground">{t.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-background rounded-lg border border-border overflow-hidden">
                <div className="flex">
                  {/* Line numbers */}
                  <div className="bg-muted/30 px-3 py-4 text-right select-none border-r border-border">
                    {code.split('\n').map((_, i) => (
                      <div
                        key={i}
                        className={`text-xs font-mono leading-6 ${
                          currentLine === i + 1
                            ? 'text-primary font-bold bg-primary/20 -mr-3 pr-3 rounded-l'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  {/* Code */}
                  <textarea
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      reset();
                    }}
                    className="flex-1 bg-transparent p-4 font-mono text-sm text-foreground resize-none focus:outline-none min-h-[300px] leading-6"
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-2 mt-4">
                {isPlaying ? (
                  <Button onClick={handlePause} variant="outline" className="gap-2">
                    <Pause className="w-4 h-4" />
                    Pause
                  </Button>
                ) : (
                  <Button onClick={handleRun} className="gap-2 glow-primary" disabled={isComplete}>
                    <Play className="w-4 h-4" />
                    {processes.length === 0 ? 'Run' : 'Continue'}
                  </Button>
                )}
                <Button onClick={handleStep} variant="outline" className="gap-2" disabled={isComplete}>
                  <SkipForward className="w-4 h-4" />
                  Step
                </Button>
                <Button onClick={handleReset} variant="outline" className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              </div>

              {/* Process Stats */}
              {processes.length > 0 && (
                <div className="flex gap-2 mt-4 flex-wrap">
                  <Badge variant="outline">Total: {stats.total}</Badge>
                  <Badge variant="outline" className="border-process-running text-process-running">
                    Running: {stats.running}
                  </Badge>
                  <Badge variant="outline" className="border-process-waiting text-process-waiting">
                    Waiting: {stats.waiting}
                  </Badge>
                  {stats.zombie > 0 && (
                    <Badge variant="outline" className="border-process-zombie text-process-zombie">
                      <Skull className="w-3 h-3 mr-1" />
                      Zombie: {stats.zombie}
                    </Badge>
                  )}
                  {stats.orphan > 0 && (
                    <Badge variant="outline" className="border-process-orphan text-process-orphan">
                      <UserX className="w-3 h-3 mr-1" />
                      Orphan: {stats.orphan}
                    </Badge>
                  )}
                </div>
              )}

              {/* Current Statement Info */}
              {currentStatement && (
                <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>Step {stepCount + 1}</Badge>
                    <span className="font-mono text-sm text-primary">{currentStatement.type}()</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{currentStatement.osExplanation}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visualization Panel */}
          <div className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle>Process Tree</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="min-h-[250px] flex items-center justify-center">
                  {processes.length === 0 ? (
                    <div className="text-center text-muted-foreground">
                      <p>Click "Run" or "Step" to start simulation</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      {renderProcessTree(processes)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Console Output */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-primary" />
                  Console Output
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px] bg-background rounded-lg border border-border p-3 font-mono text-xs">
                  {logs.length === 0 ? (
                    <p className="text-muted-foreground">No output yet...</p>
                  ) : (
                    <div className="space-y-0.5">
                      {logs.map((log, i) => (
                        <div 
                          key={i} 
                          className={`${
                            log.includes('[WARN]') ? 'text-process-zombie' :
                            log.includes('[STATE]') ? 'text-process-waiting' :
                            log.includes('[FORK]') ? 'text-process-running' :
                            log.includes('[DONE]') ? 'text-primary' :
                            'text-foreground'
                          }`}
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Parsed Statements */}
            {statements.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle>Parsed OS Calls</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[120px]">
                    <div className="space-y-1">
                      {statements.map((stmt, i) => (
                        <div
                          key={i}
                          className={`p-2 rounded text-sm flex items-center gap-2 ${
                            currentStatement === stmt
                              ? 'bg-primary/20 border border-primary'
                              : 'bg-muted/30'
                          }`}
                        >
                          <Badge variant="outline" className="font-mono text-xs">
                            L{stmt.lineNumber}
                          </Badge>
                          <span className="font-mono font-medium">{stmt.type}()</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
