import { useState, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Play, RotateCcw, ChevronRight, Pause, SkipForward } from 'lucide-react';

// Simple process node type for visualization only
interface SimpleProcessNode {
  id: string;
  pid: number;
  ppid: number;
  state: 'running' | 'waiting' | 'terminated' | 'zombie';
  children: SimpleProcessNode[];
  depth: number;
}

interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  code: string;
  expectedSteps: string[];
}

const codeTemplates: CodeTemplate[] = [
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
        // Child process
        printf("Child PID: %d\\n", getpid());
    } else {
        // Parent process
        printf("Created child: %d\\n", pid);
    }
    
    return 0;
}`,
    expectedSteps: [
      'Parent process (PID 1000) starts execution',
      'fork() called - creating child process',
      'Child process (PID 1001) created',
      'Parent continues: prints "Created child: 1001"',
      'Child executes: prints "Child PID: 1001"',
      'Both processes exit'
    ]
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
        // Child process
        printf("Child working...\\n");
        sleep(2);
        printf("Child done\\n");
        exit(0);
    } else {
        // Parent waits for child
        printf("Parent waiting...\\n");
        wait(NULL);
        printf("Child finished\\n");
    }
    
    return 0;
}`,
    expectedSteps: [
      'Parent process (PID 1000) starts',
      'fork() called - child process created',
      'Child (PID 1001) starts working',
      'Parent calls wait() - enters WAITING state',
      'Child completes and exits',
      'Parent resumes after wait() returns'
    ]
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
            printf("Child %d: PID %d\\n", i, getpid());
            exit(0);
        }
    }
    
    // Parent waits for all children
    for (int i = 0; i < 3; i++) {
        wait(NULL);
    }
    
    printf("All children done\\n");
    return 0;
}`,
    expectedSteps: [
      'Parent (PID 1000) starts loop',
      'First fork() - Child 1 (PID 1001) created',
      'Second fork() - Child 2 (PID 1002) created',
      'Third fork() - Child 3 (PID 1003) created',
      'Parent waits for each child',
      'All children complete, parent continues'
    ]
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
        // Child exits immediately
        printf("Child exiting...\\n");
        exit(0);
    } else {
        // Parent does NOT call wait()
        printf("Parent sleeping...\\n");
        sleep(30);
        // Child becomes zombie!
    }
    
    return 0;
}`,
    expectedSteps: [
      'Parent (PID 1000) forks child',
      'Child (PID 1001) created',
      'Child exits immediately',
      'Parent sleeps without calling wait()',
      'Child becomes ZOMBIE (defunct)',
      'Child remains zombie until parent exits'
    ]
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
        // Child sleeps longer
        sleep(10);
        printf("Child: my parent is now init\\n");
        printf("New PPID: %d\\n", getppid());
    } else {
        // Parent exits immediately
        printf("Parent exiting...\\n");
        exit(0);
    }
    
    return 0;
}`,
    expectedSteps: [
      'Parent (PID 1000) forks child',
      'Child (PID 1001) starts sleeping',
      'Parent exits immediately',
      'Child becomes ORPHAN',
      'Child adopted by init (PID 1)',
      'Child continues with new parent'
    ]
  },
  {
    id: 'recursive-fork',
    name: 'Recursive Forking',
    description: 'Recursive process creation (fork bomb pattern)',
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
}`,
    expectedSteps: [
      'Main (PID 1000) calls recursive_fork(3)',
      'Fork at depth 3 → Child (PID 1001)',
      'Child 1001 calls recursive_fork(2)',
      'Fork at depth 2 → Child (PID 1002)',
      'Child 1002 calls recursive_fork(1)',
      'Fork at depth 1 → Child (PID 1003)',
      'Depth 0 reached, recursion ends',
      'Each parent waits for its child'
    ]
  }
];

export default function CodeEditor() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>(codeTemplates[0].id);
  const [code, setCode] = useState(codeTemplates[0].code);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [processes, setProcesses] = useState<SimpleProcessNode[]>([]);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);

  const currentTemplate = codeTemplates.find(t => t.id === selectedTemplate)!;

  const handleTemplateChange = (templateId: string) => {
    const template = codeTemplates.find(t => t.id === templateId)!;
    setSelectedTemplate(templateId);
    setCode(template.code);
    resetExecution();
  };

  const resetExecution = () => {
    setIsRunning(false);
    setCurrentStep(-1);
    setProcesses([]);
    setHighlightedLine(null);
  };

  const initializeProcessTree = useCallback(() => {
    const root: SimpleProcessNode = {
      id: '1000',
      pid: 1000,
      ppid: 1,
      state: 'running',
      children: [],
      depth: 0
    };
    setProcesses([root]);
    return root;
  }, []);

  const runNextStep = useCallback(() => {
    const steps = currentTemplate.expectedSteps;
    
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      // Simulate process tree changes based on step
      setProcesses(prev => {
        const newProcesses = [...prev];
        
        if (nextStep === 0) {
          // Initialize with root
          return [{
            id: '1000',
            pid: 1000,
            ppid: 1,
            state: 'running',
            children: [],
            depth: 0
          } as SimpleProcessNode];
        }
        
        // Add children based on template type
        if (selectedTemplate === 'single-fork' || selectedTemplate === 'fork-wait') {
          if (nextStep === 2) {
            const root = { ...newProcesses[0] };
            const child: SimpleProcessNode = {
              id: '1001',
              pid: 1001,
              ppid: 1000,
              state: 'running',
              children: [],
              depth: 1
            };
            root.children = [child];
            return [root];
          }
          if (selectedTemplate === 'fork-wait' && nextStep === 3) {
            const root = { ...newProcesses[0], state: 'waiting' as const };
            if (root.children[0]) {
              root.children = [{ ...root.children[0], state: 'running' as const }];
            }
            return [root];
          }
          if (nextStep === 4 || nextStep === 5) {
            const root = { ...newProcesses[0], state: 'running' as const };
            if (root.children[0]) {
              root.children = [{ ...root.children[0], state: 'terminated' as const }];
            }
            return [root];
          }
        }
        
        if (selectedTemplate === 'multiple-fork') {
          if (nextStep >= 1 && nextStep <= 3) {
            const root = { ...newProcesses[0] };
            const childCount = nextStep;
            root.children = Array.from({ length: childCount }, (_, i): SimpleProcessNode => ({
              id: `${1001 + i}`,
              pid: 1001 + i,
              ppid: 1000,
              state: 'running',
              children: [],
              depth: 1
            }));
            return [root];
          }
          if (nextStep >= 4) {
            const root = { ...newProcesses[0], state: nextStep === 4 ? 'waiting' as const : 'running' as const };
            root.children = root.children.map(c => ({ ...c, state: 'terminated' as const }));
            return [root];
          }
        }
        
        if (selectedTemplate === 'zombie-process') {
          if (nextStep === 1) {
            const root = { ...newProcesses[0] };
            root.children = [{
              id: '1001',
              pid: 1001,
              ppid: 1000,
              state: 'running',
              children: [],
              depth: 1
            } as SimpleProcessNode];
            return [root];
          }
          if (nextStep >= 3) {
            const root = { ...newProcesses[0] };
            root.children = [{
              id: '1001',
              pid: 1001,
              ppid: 1000,
              state: 'zombie',
              children: [],
              depth: 1
            } as SimpleProcessNode];
            return [root];
          }
        }
        
        if (selectedTemplate === 'orphan-process') {
          if (nextStep === 1) {
            const root = { ...newProcesses[0] };
            root.children = [{
              id: '1001',
              pid: 1001,
              ppid: 1000,
              state: 'running',
              children: [],
              depth: 1
            } as SimpleProcessNode];
            return [root];
          }
          if (nextStep >= 3) {
            // Parent exits, child becomes orphan
            return [{
              id: '1001',
              pid: 1001,
              ppid: 1,
              state: 'running',
              children: [],
              depth: 0
            } as SimpleProcessNode];
          }
        }
        
        if (selectedTemplate === 'recursive-fork') {
          if (nextStep >= 1 && nextStep <= 6) {
            const depth = Math.min(nextStep, 3);
            let current: SimpleProcessNode = {
              id: '1000',
              pid: 1000,
              ppid: 1,
              state: 'running',
              children: [],
              depth: 0
            };
            const root = current;
            
            for (let i = 0; i < depth; i++) {
              const child: SimpleProcessNode = {
                id: `${1001 + i}`,
                pid: 1001 + i,
                ppid: current.pid,
                state: i === depth - 1 ? 'running' : 'waiting',
                children: [],
                depth: i + 1
              };
              current.children = [child];
              current = child;
            }
            
            return [root];
          }
        }
        
        return newProcesses;
      });
      
      // Highlight relevant code line
      const lineMap: Record<string, number[]> = {
        'single-fork': [4, 6, 6, 13, 9, 16],
        'fork-wait': [4, 4, 8, 13, 10, 15],
        'multiple-fork': [4, 5, 5, 5, 13, 16],
        'zombie-process': [4, 4, 8, 11, 8, 8],
        'orphan-process': [4, 7, 13, 7, 8, 9],
        'recursive-fork': [6, 6, 6, 6, 6, 6, 3, 11]
      };
      
      const lines = lineMap[selectedTemplate] || [];
      setHighlightedLine(lines[nextStep] || null);
    } else {
      setIsRunning(false);
    }
  }, [currentStep, currentTemplate, selectedTemplate]);

  const handleRun = () => {
    if (isRunning) {
      setIsRunning(false);
    } else {
      if (currentStep === -1) {
        initializeProcessTree();
      }
      setIsRunning(true);
    }
  };

  // Auto-advance when running
  useState(() => {
    if (isRunning) {
      const timer = setInterval(runNextStep, 1500);
      return () => clearInterval(timer);
    }
  });

  const renderProcessNode = (node: SimpleProcessNode, x: number, y: number): JSX.Element => {
    const stateColors = {
      running: 'border-process-running bg-process-running/10',
      waiting: 'border-process-waiting bg-process-waiting/10',
      terminated: 'border-muted bg-muted/10',
      zombie: 'border-process-zombie bg-process-zombie/10'
    };

    const stateLabels = {
      running: 'Running',
      waiting: 'Waiting',
      terminated: 'Exited',
      zombie: 'Zombie'
    };

    return (
      <g key={node.id}>
        <foreignObject x={x - 50} y={y - 30} width={100} height={70}>
          <div className={`rounded-lg border-2 p-2 text-center transition-all duration-300 ${stateColors[node.state]}`}>
            <div className="font-mono text-sm font-bold text-foreground">PID {node.pid}</div>
            <div className="text-xs text-muted-foreground">PPID: {node.ppid}</div>
            <Badge variant="outline" className="text-xs mt-1">
              {stateLabels[node.state]}
            </Badge>
          </div>
        </foreignObject>
        
        {node.children.map((child, index) => {
          const childX = x + (index - (node.children.length - 1) / 2) * 120;
          const childY = y + 100;
          
          return (
            <g key={child.id}>
              <line
                x1={x}
                y1={y + 35}
                x2={childX}
                y2={childY - 35}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeDasharray="4"
                className="animate-pulse"
              />
              {renderProcessNode(child, childX, childY)}
            </g>
          );
        })}
      </g>
    );
  };

  const codeLines = code.split('\n');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Code Template Editor</h1>
          <p className="text-muted-foreground">
            Edit and visualize C code execution with process tree animations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Code Editor Panel */}
          <div className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Template Selection</CardTitle>
                  <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {codeTemplates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">{currentTemplate.description}</p>
              </CardHeader>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-mono">main.c</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={resetExecution}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleRun}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isRunning ? (
                        <>
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Run
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={runNextStep}
                      disabled={currentStep >= currentTemplate.expectedSteps.length - 1}
                    >
                      <SkipForward className="w-4 h-4 mr-1" />
                      Step
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative font-mono text-sm bg-secondary/50 rounded-lg overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-secondary/80 flex flex-col items-end pr-2 pt-3 text-muted-foreground select-none">
                    {codeLines.map((_, i) => (
                      <div 
                        key={i} 
                        className={`leading-6 text-xs ${highlightedLine === i + 1 ? 'text-primary font-bold' : ''}`}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <Textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="min-h-[400px] pl-14 pr-4 py-3 bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 leading-6"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  />
                  {highlightedLine && (
                    <div 
                      className="absolute left-12 right-0 h-6 bg-primary/20 pointer-events-none transition-all duration-300"
                      style={{ top: `${(highlightedLine - 1) * 24 + 12}px` }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visualization Panel */}
          <div className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Process Tree Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-secondary/30 rounded-lg h-[300px] relative overflow-hidden">
                  {processes.length > 0 ? (
                    <svg width="100%" height="100%" viewBox="0 0 400 280">
                      {renderProcessNode(processes[0], 200, 50)}
                    </svg>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      Click "Run" or "Step" to start visualization
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Execution Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {currentTemplate.expectedSteps.map((step, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ${
                        index === currentStep 
                          ? 'bg-primary/20 border border-primary' 
                          : index < currentStep 
                            ? 'bg-secondary/50 opacity-60' 
                            : 'bg-secondary/20'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        index === currentStep 
                          ? 'bg-primary text-primary-foreground' 
                          : index < currentStep 
                            ? 'bg-process-running text-white' 
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {index < currentStep ? '✓' : index + 1}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${index === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {step}
                        </p>
                      </div>
                      {index === currentStep && (
                        <ChevronRight className="w-4 h-4 text-primary animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
