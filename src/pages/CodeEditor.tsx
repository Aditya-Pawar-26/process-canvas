import { useState, useEffect, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, RotateCcw, ChevronRight, Pause, SkipForward, Code, Terminal } from 'lucide-react';
import { useCodeParser, ParsedProcess } from '@/hooks/useCodeParser';

const codeTemplates = [
  {
    id: 'single-fork',
    name: 'Single Fork',
    description: 'Basic fork() creating one child process',
    code: `#include <stdio.h>
#include <unistd.h>

int main() {
    printf("Parent PID: %d\\n", getpid());
    
    pid_t pid = fork();
    
    if (pid == 0) {
        printf("Child PID: %d\\n", getpid());
        exit(0);
    } else {
        printf("Created child: %d\\n", pid);
        wait(NULL);
    }
    
    return 0;
}`
  },
  {
    id: 'fork-wait',
    name: 'Fork with Wait',
    description: 'Parent waits for child to complete',
    code: `#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    pid_t pid = fork();
    
    if (pid == 0) {
        printf("Child working...\\n");
        sleep(2);
        printf("Child done\\n");
        exit(0);
    } else {
        printf("Parent waiting...\\n");
        wait(NULL);
        printf("Child finished\\n");
    }
    
    return 0;
}`
  },
  {
    id: 'multiple-fork',
    name: 'Multiple Forks',
    description: 'Creating multiple child processes',
    code: `#include <stdio.h>
#include <unistd.h>

int main() {
    for (int i = 0; i < 3; i++) {
        pid_t pid = fork();
        
        if (pid == 0) {
            printf("Child %d created\\n", i);
            exit(0);
        }
    }
    
    for (int i = 0; i < 3; i++) {
        wait(NULL);
    }
    
    printf("All children done\\n");
    return 0;
}`
  },
  {
    id: 'zombie-process',
    name: 'Zombie Process',
    description: 'Child exits but parent does not wait',
    code: `#include <stdio.h>
#include <unistd.h>

int main() {
    pid_t pid = fork();
    
    if (pid == 0) {
        printf("Child exiting...\\n");
        exit(0);
    } else {
        printf("Parent sleeping...\\n");
        sleep(30);
    }
    
    return 0;
}`
  },
  {
    id: 'orphan-process',
    name: 'Orphan Process',
    description: 'Parent exits before child completes',
    code: `#include <stdio.h>
#include <unistd.h>

int main() {
    pid_t pid = fork();
    
    if (pid == 0) {
        sleep(5);
        printf("Child: parent is now init\\n");
        printf("New PPID: %d\\n", getppid());
    } else {
        printf("Parent exiting...\\n");
        exit(0);
    }
    
    return 0;
}`
  },
  {
    id: 'recursive-fork',
    name: 'Recursive Forking',
    description: 'Recursive process creation (fork chain)',
    code: `#include <stdio.h>
#include <unistd.h>

void recursive_fork(int depth) {
    if (depth <= 0) return;
    
    pid_t pid = fork();
    
    if (pid == 0) {
        printf("Child at depth %d\\n", depth);
        recursive_fork(depth - 1);
        exit(0);
    } else {
        wait(NULL);
    }
}

int main() {
    recursive_fork(3);
    return 0;
}`
  }
];

export default function CodeEditor() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>(codeTemplates[0].id);
  const [code, setCode] = useState(codeTemplates[0].code);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const {
    processes,
    executionSteps,
    currentStepIndex,
    logs,
    initializeExecution,
    executeStep,
    reset,
    getCurrentStep,
    isComplete
  } = useCodeParser();

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
    if (currentStepIndex === -1) {
      initializeExecution(code);
    }
    setIsPlaying(true);
  }, [currentStepIndex, code, initializeExecution]);

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleStep = useCallback(() => {
    if (currentStepIndex === -1) {
      initializeExecution(code);
    }
    executeStep();
  }, [currentStepIndex, code, initializeExecution, executeStep]);

  const handleReset = () => {
    reset();
    setIsPlaying(false);
  };

  // Auto-play effect
  useEffect(() => {
    if (isPlaying && !isComplete) {
      const timer = setTimeout(() => {
        executeStep();
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isComplete) {
      setIsPlaying(false);
    }
  }, [isPlaying, isComplete, executeStep]);

  const currentStep = getCurrentStep();
  const currentLine = currentStep?.lineNumber ?? -1;

  const renderProcessTree = (procs: ParsedProcess[], depth: number = 0): JSX.Element[] => {
    return procs.map((proc) => {
      const stateColors: Record<string, string> = {
        running: 'border-process-running bg-process-running/10',
        waiting: 'border-process-waiting bg-process-waiting/10',
        terminated: 'border-muted bg-muted/10',
        zombie: 'border-process-zombie bg-process-zombie/10',
        orphan: 'border-purple-500 bg-purple-500/10'
      };

      const stateLabels: Record<string, string> = {
        running: 'Running',
        waiting: 'Waiting',
        terminated: 'Exited',
        zombie: 'Zombie',
        orphan: 'Orphan'
      };

      return (
        <div key={proc.id} className="flex flex-col items-center">
          <div
            className={`rounded-lg border-2 p-3 text-center transition-all duration-300 min-w-[100px] ${stateColors[proc.state]}`}
          >
            <div className="font-mono text-sm font-bold text-foreground">PID {proc.pid}</div>
            <div className="text-xs text-muted-foreground">PPID: {proc.ppid}</div>
            <Badge variant="outline" className="text-xs mt-1">
              {stateLabels[proc.state]}
            </Badge>
          </div>
          {proc.children.length > 0 && (
            <>
              <div className="w-px h-6 bg-primary/50" />
              <div className="flex gap-4">
                {renderProcessTree(proc.children, depth + 1)}
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Code Template Editor</h1>
          <p className="text-muted-foreground">
            Write or modify C-like code and visualize process execution step-by-step
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
                        {t.name}
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
                  <div className="bg-muted/30 px-3 py-4 text-right select-none">
                    {code.split('\n').map((_, i) => (
                      <div
                        key={i}
                        className={`text-xs font-mono leading-6 ${
                          currentLine === i + 1
                            ? 'text-primary font-bold'
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
                    onChange={(e) => setCode(e.target.value)}
                    className="flex-1 bg-transparent p-4 font-mono text-sm text-foreground resize-none focus:outline-none min-h-[400px] leading-6"
                    spellCheck={false}
                    style={{
                      background: code.split('\n').map((_, i) =>
                        currentLine === i + 1
                          ? `linear-gradient(hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.15))`
                          : 'transparent'
                      ).join(', ')
                    }}
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
                  <Button onClick={handleRun} className="gap-2 glow-primary">
                    <Play className="w-4 h-4" />
                    Run
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

              {/* Current Step Info */}
              {currentStep && (
                <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ChevronRight className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-primary">Step {currentStepIndex + 1}</span>
                  </div>
                  <p className="text-sm font-mono text-muted-foreground">{currentStep.code}</p>
                  <p className="text-sm mt-2">{currentStep.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{currentStep.osExplanation}</p>
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
                <div className="min-h-[300px] flex items-center justify-center">
                  {processes.length === 0 ? (
                    <div className="text-center text-muted-foreground">
                      <p>Click "Run" or "Step" to start simulation</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
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
                <ScrollArea className="h-[150px] bg-background rounded-lg border border-border p-3">
                  {logs.length === 0 ? (
                    <p className="text-muted-foreground text-sm font-mono">No output yet...</p>
                  ) : (
                    <div className="space-y-1">
                      {logs.map((log, i) => (
                        <div key={i} className="text-sm font-mono text-foreground">
                          <span className="text-muted-foreground">$</span> {log}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Execution Steps */}
            {executionSteps.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle>Execution Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[150px]">
                    <div className="space-y-2">
                      {executionSteps.map((step, i) => (
                        <div
                          key={i}
                          className={`p-2 rounded-lg text-sm ${
                            i === currentStepIndex
                              ? 'bg-primary/20 border border-primary'
                              : i < currentStepIndex
                              ? 'bg-muted/50'
                              : 'bg-background'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              L{step.lineNumber}
                            </Badge>
                            <span className="font-medium">{step.action}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
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
