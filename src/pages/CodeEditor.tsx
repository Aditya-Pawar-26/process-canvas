import { useState, useEffect, useCallback, useRef } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Play, RotateCcw, Pause, SkipForward, Code, Terminal, Info, Skull, UserX, Gauge, Lightbulb, FileCode } from 'lucide-react';
import { useCodeSimulator, SimProcess } from '@/hooks/useCodeSimulator';
import { ProcessTreeView } from '@/components/code-editor/ProcessTreeView';
import { SyntaxHighlightedCode } from '@/components/code-editor/SyntaxHighlightedCode';

const codeTemplates = [
  {
    id: 'basic-fork-if',
    name: 'Fork with if/else',
    description: 'Standard fork pattern with child/parent branching',
    code: `#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    printf("Parent starting\\n");
    
    if(fork() == 0) {
        printf("I am the child, PID: %d\\n", getpid());
        exit(0);
    } else {
        printf("I am the parent, waiting...\\n");
        wait(NULL);
        printf("Child finished\\n");
    }
}`,
  },
  {
    id: 'single-fork',
    name: 'Simple Fork',
    description: 'Both processes continue running',
    code: `#include <stdio.h>
#include <unistd.h>

int main() {
    fork();
    printf("Hello from PID %d\\n", getpid());
}`,
  },
  {
    id: 'zombie-demo',
    name: 'Zombie Process',
    description: 'Child exits but parent never calls wait()',
    code: `#include <stdio.h>
#include <unistd.h>

int main() {
    if(fork() == 0) {
        printf("Child exiting\\n");
        exit(0);
    } else {
        printf("Parent sleeping, not calling wait()\\n");
        sleep(3);
    }
}`,
  },
  {
    id: 'orphan-demo',
    name: 'Orphan Process',
    description: 'Parent exits first, child adopted by init',
    code: `#include <stdio.h>
#include <unistd.h>

int main() {
    if(fork() == 0) {
        sleep(2);
        printf("Child still running, adopted by init\\n");
        printf("My new PPID: %d\\n", getppid());
    } else {
        printf("Parent exiting immediately\\n");
        exit(0);
    }
}`,
  },
  {
    id: 'double-fork',
    name: 'Double Fork',
    description: '2 forks → 4 processes',
    code: `#include <stdio.h>
#include <unistd.h>

int main() {
    fork();
    fork();
    printf("PID %d, PPID %d\\n", getpid(), getppid());
}`,
  },
  {
    id: 'triple-fork',
    name: 'Triple Fork',
    description: '3 forks → 8 processes',
    code: `#include <stdio.h>
#include <unistd.h>

int main() {
    fork();
    fork();
    fork();
    printf("PID %d\\n", getpid());
}`,
  },
  {
    id: 'fork-loop',
    name: 'Fork in Loop',
    description: 'for loop with fork → exponential processes',
    code: `#include <stdio.h>
#include <unistd.h>

int main() {
    for (int i = 0; i < 3; i++) {
        pid_t pid = fork();
        if (pid < 0) {
            printf("Fork failed\\n");
            return 1;
        }
    }
    printf("Process PID: %d, Parent PID: %d\\n", getpid(), getppid());
    sleep(1);
    return 0;
}`,
  },
  {
    id: 'fork-wait-clean',
    name: 'Fork + Wait (Clean)',
    description: 'Proper cleanup with wait()',
    code: `#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    if(fork() == 0) {
        printf("Child PID %d doing work\\n", getpid());
        sleep(1);
        printf("Child done\\n");
        exit(0);
    } else {
        printf("Parent waiting for child\\n");
        wait(NULL);
        printf("Parent: child reaped, no zombie\\n");
    }
}`,
  },
  {
    id: 'chain-fork',
    name: 'Chain Fork',
    description: 'Only child forks again → linear chain',
    code: `#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    if(fork() == 0) {
        printf("Child 1, PID %d\\n", getpid());
        if(fork() == 0) {
            printf("Grandchild, PID %d\\n", getpid());
            exit(0);
        }
        wait(NULL);
        exit(0);
    }
    wait(NULL);
    printf("All children done\\n");
}`,
  },
];

const DEFAULT_CODE = `#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    // Write your fork code here
    fork();
    printf("Hello from PID %d\\n", getpid());
}`;

export default function CodeEditor() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [code, setCode] = useState(DEFAULT_CODE);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    getProcessStats,
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

  const handlePause = () => setIsPlaying(false);

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

  useEffect(() => {
    if (isPlaying && !isComplete) {
      const timer = setTimeout(() => executeStep(), speed);
      return () => clearTimeout(timer);
    } else if (isComplete) {
      setIsPlaying(false);
    }
  }, [isPlaying, isComplete, executeStep, stepCount, speed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in textarea
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') { e.preventDefault(); isPlaying ? handlePause() : handleRun(); }
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); handleStep(); }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); handleReset(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPlaying, handleRun, handleStep]);

  const currentStatement = getCurrentStatement();
  const currentLine = currentStatement?.lineNumber ?? -1;
  const stats = getProcessStats();

  // Handle tab key in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 4; }, 0);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container py-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <FileCode className="w-8 h-8 text-primary" />
            C Process Simulator
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
            Write any C code using <code className="text-primary font-mono">fork()</code>, <code className="text-primary font-mono">wait()</code>, <code className="text-primary font-mono">exit()</code>, <code className="text-primary font-mono">sleep()</code>, and <code className="text-primary font-mono">printf()</code> — the simulator parses and visualizes OS process behavior step-by-step.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Code Panel */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Code className="w-5 h-5 text-primary" />
                  Editor
                </CardTitle>
                <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Load example..." />
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
              {/* Code editor with line numbers */}
              <div className="bg-background rounded-lg border border-border overflow-hidden relative">
                <div className="flex">
                  {/* Line numbers */}
                  <div className="bg-muted/30 px-3 py-4 text-right select-none border-r border-border min-w-[3rem]">
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
                  {/* Editor area with syntax overlay */}
                  <div className="relative flex-1">
                    {/* Syntax highlighted overlay (read-only visual) */}
                    <SyntaxHighlightedCode code={code} currentLine={currentLine} />
                    {/* Actual textarea (transparent text, handles input) */}
                    <textarea
                      ref={textareaRef}
                      value={code}
                      onChange={(e) => { setCode(e.target.value); reset(); setIsPlaying(false); }}
                      onKeyDown={handleKeyDown}
                      className="absolute inset-0 w-full h-full bg-transparent p-4 font-mono text-sm resize-none focus:outline-none leading-6 text-transparent caret-foreground z-10"
                      spellCheck={false}
                      style={{ caretColor: 'hsl(var(--foreground))' }}
                    />
                  </div>
                </div>
              </div>

              {/* Supported functions hint */}
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lightbulb className="w-3 h-3" />
                <span>
                  Supports: <code className="text-primary/80">fork()</code>, <code className="text-primary/80">if(fork()==0)</code>, <code className="text-primary/80">wait()</code>, <code className="text-primary/80">exit()</code>, <code className="text-primary/80">sleep()</code>, <code className="text-primary/80">printf()</code>
                </span>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-4 mt-4">
                <div className="flex gap-2">
                  {isPlaying ? (
                    <Button onClick={handlePause} variant="outline" className="gap-2">
                      <Pause className="w-4 h-4" /> Pause
                    </Button>
                  ) : (
                    <Button onClick={handleRun} className="gap-2 glow-primary" disabled={isComplete}>
                      <Play className="w-4 h-4" />
                      {processes.length === 0 ? 'Run' : 'Continue'}
                    </Button>
                  )}
                  <Button onClick={handleStep} variant="outline" className="gap-2" disabled={isComplete}>
                    <SkipForward className="w-4 h-4" /> Step
                  </Button>
                  <Button onClick={handleReset} variant="outline" className="gap-2">
                    <RotateCcw className="w-4 h-4" /> Reset
                  </Button>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                  <Gauge className="w-4 h-4 text-muted-foreground" />
                  <Slider value={[speed]} onValueChange={([v]) => setSpeed(v)} min={200} max={6000} step={100} className="flex-1" />
                  <span className="text-xs text-muted-foreground font-mono w-14 text-right">{(speed / 1000).toFixed(1)}s</span>
                </div>
              </div>

              {/* Process Stats */}
              {processes.length > 0 && (
                <div className="flex gap-2 mt-4 flex-wrap">
                  <Badge variant="outline">Total: {stats.total}</Badge>
                  <Badge variant="outline" className="border-process-running text-process-running">Running: {stats.running}</Badge>
                  <Badge variant="outline" className="border-process-waiting text-process-waiting">Waiting: {stats.waiting}</Badge>
                  {stats.zombie > 0 && (
                    <Badge variant="outline" className="border-process-zombie text-process-zombie">
                      <Skull className="w-3 h-3 mr-1" /> Zombie: {stats.zombie}
                    </Badge>
                  )}
                  {stats.orphan > 0 && (
                    <Badge variant="outline" className="border-process-orphan text-process-orphan">
                      <UserX className="w-3 h-3 mr-1" /> Orphan: {stats.orphan}
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
                    {currentStatement.scope !== 'any' && (
                      <Badge variant="outline" className="text-xs">{currentStatement.scope} only</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{currentStatement.osExplanation}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visualization Panel */}
          <div className="space-y-4">
            <ProcessTreeView processes={processes} />

            {/* Console Output */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
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
                            log.includes('[PRINT]') ? 'text-primary' :
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

            {/* Parsed Instructions */}
            {statements.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Parsed Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[140px]">
                    <div className="space-y-1">
                      {statements.filter(s => s.type !== 'noop' && s.type !== 'else-block' && s.type !== 'end-block').map((stmt, i) => (
                        <div
                          key={i}
                          className={`p-2 rounded text-sm flex items-center gap-2 ${
                            currentStatement === stmt ? 'bg-primary/20 border border-primary' : 'bg-muted/30'
                          }`}
                        >
                          {stmt.lineNumber > 0 && (
                            <Badge variant="outline" className="font-mono text-xs">L{stmt.lineNumber}</Badge>
                          )}
                          <span className="font-mono font-medium">{stmt.type}()</span>
                          {stmt.scope !== 'any' && (
                            <Badge variant="secondary" className="text-xs">{stmt.scope}</Badge>
                          )}
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
