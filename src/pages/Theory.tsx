import { Navigation } from '@/components/Navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  GitFork, Clock, Skull, UserX, TreeDeciduous, 
  Cpu, Hash, ArrowRight, ArrowDown, Layers, 
  BookOpen, Link2, Binary, Network
} from 'lucide-react';

const Theory = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-8 max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Theory & Concepts</h1>
          <p className="text-muted-foreground">
            Comprehensive reference for OS process management and tree data structures
          </p>
        </div>

        <Tabs defaultValue="os" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="os">OS Concepts</TabsTrigger>
            <TabsTrigger value="dsa">DSA Concepts</TabsTrigger>
            <TabsTrigger value="bridge">OS ↔ DSA Bridge</TabsTrigger>
          </TabsList>

          {/* OS CONCEPTS TAB */}
          <TabsContent value="os" className="space-y-6">
            {/* Process Fundamentals */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-primary" />
                  Process Fundamentals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">What is a Process?</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    A <strong>process</strong> is a program in execution. It's the fundamental unit of work in an operating system.
                    Each process has its own memory space, program counter, registers, and system resources.
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Process Control Block (PCB)</h4>
                  <p className="text-muted-foreground text-sm mb-3">
                    The kernel maintains a <strong>Process Control Block</strong> for each process containing:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 bg-muted/30 p-2 rounded">
                      <Hash className="w-4 h-4 text-primary" />
                      <span><strong>PID</strong> - Process ID (unique identifier)</span>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/30 p-2 rounded">
                      <Hash className="w-4 h-4 text-primary" />
                      <span><strong>PPID</strong> - Parent Process ID</span>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/30 p-2 rounded">
                      <Cpu className="w-4 h-4 text-primary" />
                      <span><strong>State</strong> - Running, Waiting, etc.</span>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/30 p-2 rounded">
                      <Binary className="w-4 h-4 text-primary" />
                      <span><strong>PC</strong> - Program Counter</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold text-foreground mb-2">The init Process (PID 1)</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    The <strong>init</strong> process is the first process started by the kernel. It has PID 1 and is the 
                    ancestor of all other processes. When a process becomes an orphan, init adopts it. Init also 
                    periodically calls wait() to clean up zombie children.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* System Calls */}
            <Accordion type="multiple" className="space-y-4">
              {/* fork() */}
              <AccordionItem value="fork" className="bg-card border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <GitFork className="w-5 h-5 text-primary" />
                    <span className="font-semibold">fork() System Call</span>
                    <Badge variant="outline" className="ml-2">Process Creation</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 space-y-4">
                  <p>
                    The <code className="bg-muted px-1 rounded">fork()</code> system call creates a new process by 
                    <strong> duplicating the calling process</strong>. The new process is called the <em>child</em>, 
                    and the original is the <em>parent</em>.
                  </p>
                  
                  <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                    <h5 className="font-semibold text-foreground">How fork() Works Internally:</h5>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Kernel allocates a new PCB entry for the child</li>
                      <li>Child gets a <strong>unique PID</strong></li>
                      <li>Child's PPID is set to parent's PID</li>
                      <li>Parent's address space is copied (or copy-on-write)</li>
                      <li>Both processes continue from the same instruction</li>
                    </ol>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h5 className="font-semibold text-foreground mb-2">Return Values:</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-process-running" />
                        <span><strong>In parent:</strong> Returns child's PID (positive number)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-process-waiting" />
                        <span><strong>In child:</strong> Returns 0</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-process-zombie" />
                        <span><strong>On error:</strong> Returns -1 (no child created)</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
                    <h5 className="font-semibold text-primary mb-2">🌳 Tree Growth:</h5>
                    <p className="text-sm">
                      Each fork() call increases the process tree by exactly one node. 
                      With <strong>n consecutive forks</strong>, the total number of processes becomes <strong>2ⁿ</strong>.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* wait() */}
              <AccordionItem value="wait" className="bg-card border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-process-waiting" />
                    <span className="font-semibold">wait() System Call</span>
                    <Badge variant="outline" className="ml-2">Synchronization</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 space-y-4">
                  <p>
                    The <code className="bg-muted px-1 rounded">wait()</code> system call suspends the calling process 
                    until one of its children terminates. It's essential for <strong>preventing zombie processes</strong>.
                  </p>
                  
                  <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                    <h5 className="font-semibold text-foreground">wait() Behavior:</h5>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>If a zombie child exists → immediately reap it and return</li>
                      <li>If running children exist → block until one exits</li>
                      <li>If no children → return immediately with error</li>
                      <li>Retrieves child's exit status</li>
                    </ul>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h5 className="font-semibold text-foreground mb-2">Variants:</h5>
                    <div className="space-y-2 text-sm">
                      <p><code className="bg-muted px-1 rounded">wait(NULL)</code> - Wait for any child, discard status</p>
                      <p><code className="bg-muted px-1 rounded">waitpid(pid, &status, 0)</code> - Wait for specific child</p>
                      <p><code className="bg-muted px-1 rounded">waitpid(-1, NULL, WNOHANG)</code> - Non-blocking check</p>
                    </div>
                  </div>

                  <div className="bg-process-waiting/20 border border-process-waiting/30 p-4 rounded-lg">
                    <h5 className="font-semibold text-process-waiting mb-2">⏳ Why wait() Matters:</h5>
                    <p className="text-sm">
                      Without wait(), child processes become zombies after exit(). The zombie's PCB entry 
                      remains in the process table until the parent reads the exit status via wait().
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* exit() */}
              <AccordionItem value="exit" className="bg-card border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <ArrowDown className="w-5 h-5 text-muted-foreground" />
                    <span className="font-semibold">exit() System Call</span>
                    <Badge variant="outline" className="ml-2">Termination</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 space-y-4">
                  <p>
                    The <code className="bg-muted px-1 rounded">exit()</code> system call terminates 
                    <strong> only the calling process</strong>. The outcome depends on the parent's state.
                  </p>
                  
                  <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                    <h5 className="font-semibold text-foreground">Possible Outcomes:</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Badge className="bg-process-terminated text-background">Clean Exit</Badge>
                        <span>Parent is waiting → child terminated, parent resumes</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge className="bg-process-zombie text-background">Zombie</Badge>
                        <span>Parent alive but not waiting → child becomes zombie</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge className="bg-process-orphan text-background">Orphan</Badge>
                        <span>Parent already exited → child continues as orphan</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h5 className="font-semibold text-foreground mb-2">When exit() is called:</h5>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>All open file descriptors are closed</li>
                      <li>Memory is released (mostly)</li>
                      <li>Children are adopted by init</li>
                      <li>Parent is signaled (SIGCHLD)</li>
                      <li>PCB entry is kept for exit status</li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Zombie Process */}
              <AccordionItem value="zombie" className="bg-card border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Skull className="w-5 h-5 text-process-zombie" />
                    <span className="font-semibold">Zombie Process</span>
                    <Badge variant="outline" className="border-process-zombie text-process-zombie ml-2">Defunct</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 space-y-4">
                  <p>
                    A <strong>zombie process</strong> (also called defunct) is a process that has terminated but 
                    still has an entry in the process table because its parent hasn't read its exit status.
                  </p>
                  
                  <div className="bg-process-zombie/20 border border-process-zombie/30 p-4 rounded-lg space-y-3">
                    <h5 className="font-semibold text-process-zombie">Zombie Creation Conditions:</h5>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Child process calls exit()</li>
                      <li>Parent process is <strong>still alive</strong></li>
                      <li>Parent has <strong>NOT called wait()</strong></li>
                    </ol>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h5 className="font-semibold text-foreground mb-2">Zombie Characteristics:</h5>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>State: <code className="bg-muted px-1 rounded">Z</code> or <code className="bg-muted px-1 rounded">Z+</code> in ps</li>
                      <li>Cannot execute any code</li>
                      <li>Cannot fork new processes</li>
                      <li>Uses minimal resources (just PCB entry)</li>
                      <li>PPID unchanged (original parent)</li>
                    </ul>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h5 className="font-semibold text-foreground mb-2">How to Remove Zombies:</h5>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Parent calls wait() or waitpid()</li>
                      <li>Parent terminates (init adopts and reaps)</li>
                      <li>Kill the parent process</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Orphan Process */}
              <AccordionItem value="orphan" className="bg-card border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <UserX className="w-5 h-5 text-process-orphan" />
                    <span className="font-semibold">Orphan Process</span>
                    <Badge variant="outline" className="border-process-orphan text-process-orphan ml-2">Adopted</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 space-y-4">
                  <p>
                    An <strong>orphan process</strong> is a process whose parent has terminated while the 
                    process itself is still running. The kernel automatically adopts it to init (PID 1).
                  </p>
                  
                  <div className="bg-process-orphan/20 border border-process-orphan/30 p-4 rounded-lg space-y-3">
                    <h5 className="font-semibold text-process-orphan">Orphan Creation Conditions:</h5>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Parent process calls exit() or is killed</li>
                      <li>Child process is <strong>still running</strong></li>
                      <li>Kernel reassigns PPID to 1</li>
                    </ol>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h5 className="font-semibold text-foreground mb-2">Orphan Characteristics:</h5>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>State: <strong>Still RUNNING</strong></li>
                      <li>PPID changes to 1 (init)</li>
                      <li>Can continue normal execution</li>
                      <li>Can fork new children</li>
                      <li>Init will wait() and clean up when it exits</li>
                    </ul>
                  </div>

                  <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg">
                    <h5 className="font-semibold text-destructive mb-2">🔴 Key Difference: Zombie vs Orphan</h5>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-process-zombie">Zombie:</p>
                        <ul className="list-disc list-inside">
                          <li>Child is TERMINATED</li>
                          <li>Parent is ALIVE</li>
                          <li>Parent not waiting</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-process-orphan">Orphan:</p>
                        <ul className="list-disc list-inside">
                          <li>Child is RUNNING</li>
                          <li>Parent is DEAD</li>
                          <li>Adopted by init</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* DSA CONCEPTS TAB */}
          <TabsContent value="dsa" className="space-y-6">
            {/* Tree Fundamentals */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TreeDeciduous className="w-5 h-5 text-primary" />
                  Tree Data Structure Fundamentals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Definition</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    A <strong>tree</strong> is a hierarchical, non-linear data structure consisting of nodes 
                    connected by edges. It has exactly one root node and every other node has exactly one parent.
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Key Terminology</h4>
                  <div className="grid sm:grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted/30 p-3 rounded">
                      <strong>Node:</strong> Basic unit containing data
                    </div>
                    <div className="bg-muted/30 p-3 rounded">
                      <strong>Edge:</strong> Connection between nodes
                    </div>
                    <div className="bg-muted/30 p-3 rounded">
                      <strong>Root:</strong> Topmost node (no parent)
                    </div>
                    <div className="bg-muted/30 p-3 rounded">
                      <strong>Leaf:</strong> Node with no children
                    </div>
                    <div className="bg-muted/30 p-3 rounded">
                      <strong>Parent:</strong> Node with children below it
                    </div>
                    <div className="bg-muted/30 p-3 rounded">
                      <strong>Child:</strong> Node connected below parent
                    </div>
                    <div className="bg-muted/30 p-3 rounded">
                      <strong>Siblings:</strong> Nodes with same parent
                    </div>
                    <div className="bg-muted/30 p-3 rounded">
                      <strong>Subtree:</strong> Node and all descendants
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tree Properties */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Tree Properties
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h5 className="font-semibold text-foreground mb-2">Depth</h5>
                    <p className="text-sm text-muted-foreground">
                      Length of path from root to the node. Root has depth 0.
                    </p>
                    <code className="text-xs bg-muted px-1 rounded mt-2 block">depth(root) = 0</code>
                  </div>
                  
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h5 className="font-semibold text-foreground mb-2">Height</h5>
                    <p className="text-sm text-muted-foreground">
                      Length of longest path from node to a leaf. Leaf has height 0.
                    </p>
                    <code className="text-xs bg-muted px-1 rounded mt-2 block">height(tree) = max_depth</code>
                  </div>
                  
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h5 className="font-semibold text-foreground mb-2">Degree</h5>
                    <p className="text-sm text-muted-foreground">
                      Number of children a node has. Tree degree = max node degree.
                    </p>
                    <code className="text-xs bg-muted px-1 rounded mt-2 block">degree(leaf) = 0</code>
                  </div>
                  
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h5 className="font-semibold text-foreground mb-2">Size</h5>
                    <p className="text-sm text-muted-foreground">
                      Total number of nodes in the tree or subtree.
                    </p>
                    <code className="text-xs bg-muted px-1 rounded mt-2 block">size = 1 + Σ children_size</code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tree Types */}
            <Accordion type="multiple" className="space-y-4">
              <AccordionItem value="nary" className="bg-card border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Network className="w-5 h-5 text-primary" />
                    <span className="font-semibold">N-ary (General) Trees</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 space-y-3">
                  <p>
                    An <strong>N-ary tree</strong> (or general tree) is a tree where each node can have 
                    at most N children. Process trees are general trees with no fixed limit on children.
                  </p>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h5 className="font-semibold text-foreground mb-2">Types:</h5>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li><strong>Binary Tree:</strong> N = 2 (at most 2 children)</li>
                      <li><strong>Ternary Tree:</strong> N = 3 (at most 3 children)</li>
                      <li><strong>General Tree:</strong> No fixed limit on N</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="traversals" className="bg-card border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <ArrowRight className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Tree Traversals</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 space-y-4">
                  <div className="grid gap-4">
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <h5 className="font-semibold text-foreground mb-2">Preorder (Root → Children)</h5>
                      <p className="text-sm">Visit root first, then recursively visit each subtree left to right.</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded block mt-2">
                        preorder(node): visit(node); for child in children: preorder(child)
                      </code>
                    </div>
                    
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <h5 className="font-semibold text-foreground mb-2">Postorder (Children → Root)</h5>
                      <p className="text-sm">Visit all children first, then visit root.</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded block mt-2">
                        postorder(node): for child in children: postorder(child); visit(node)
                      </code>
                    </div>
                    
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <h5 className="font-semibold text-foreground mb-2">Level Order (BFS)</h5>
                      <p className="text-sm">Visit all nodes at depth d before nodes at depth d+1.</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded block mt-2">
                        levelorder(root): queue = [root]; while queue: visit(dequeue()); enqueue(children)
                      </code>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* OS ↔ DSA BRIDGE TAB */}
          <TabsContent value="bridge" className="space-y-6">
            <Card className="bg-primary/10 border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-primary" />
                  The OS-DSA Connection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Process trees in operating systems are a <strong>real-world application</strong> of 
                  general tree data structures from DSA. Understanding this connection helps you see 
                  how abstract concepts apply to systems programming.
                </p>
              </CardContent>
            </Card>

            {/* Concept Mapping Table */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Concept Mapping
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 font-semibold text-foreground">OS Concept</th>
                        <th className="text-left p-3 font-semibold text-foreground">DSA Equivalent</th>
                        <th className="text-left p-3 font-semibold text-foreground">Explanation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="p-3"><code className="bg-muted px-1 rounded">Process</code></td>
                        <td className="p-3">Tree Node</td>
                        <td className="p-3 text-muted-foreground">Each process is a node in the tree</td>
                      </tr>
                      <tr>
                        <td className="p-3"><code className="bg-muted px-1 rounded">fork()</code></td>
                        <td className="p-3">Add Child Node</td>
                        <td className="p-3 text-muted-foreground">Creates new child node, increases degree</td>
                      </tr>
                      <tr>
                        <td className="p-3"><code className="bg-muted px-1 rounded">PID</code></td>
                        <td className="p-3">Node Value/ID</td>
                        <td className="p-3 text-muted-foreground">Unique identifier for each node</td>
                      </tr>
                      <tr>
                        <td className="p-3"><code className="bg-muted px-1 rounded">PPID</code></td>
                        <td className="p-3">Parent Pointer</td>
                        <td className="p-3 text-muted-foreground">Reference to parent node</td>
                      </tr>
                      <tr>
                        <td className="p-3">Process Tree</td>
                        <td className="p-3">N-ary Tree</td>
                        <td className="p-3 text-muted-foreground">No fixed limit on children per node</td>
                      </tr>
                      <tr>
                        <td className="p-3"><code className="bg-muted px-1 rounded">init</code> (PID 1)</td>
                        <td className="p-3">Root Node</td>
                        <td className="p-3 text-muted-foreground">Ancestor of all other processes</td>
                      </tr>
                      <tr>
                        <td className="p-3">Process with no children</td>
                        <td className="p-3">Leaf Node</td>
                        <td className="p-3 text-muted-foreground">Degree = 0</td>
                      </tr>
                      <tr>
                        <td className="p-3">Orphan adoption</td>
                        <td className="p-3">Re-parenting</td>
                        <td className="p-3 text-muted-foreground">Moving node to different parent (init)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Traversal Analogies */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Traversal Analogies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="bg-process-running/10 border border-process-running/30 p-4 rounded-lg">
                    <h5 className="font-semibold text-process-running mb-2">Preorder ≈ Process Execution Order</h5>
                    <p className="text-sm text-muted-foreground">
                      Like how a parent process runs before its children are forked. 
                      The parent "visits" (executes code) before creating children.
                    </p>
                  </div>
                  
                  <div className="bg-process-waiting/10 border border-process-waiting/30 p-4 rounded-lg">
                    <h5 className="font-semibold text-process-waiting mb-2">Postorder ≈ wait() Pattern</h5>
                    <p className="text-sm text-muted-foreground">
                      Like using wait() properly - children complete before parent continues. 
                      All child processes exit before parent proceeds past wait().
                    </p>
                  </div>
                  
                  <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
                    <h5 className="font-semibold text-primary mb-2">Level Order ≈ Generation View</h5>
                    <p className="text-sm text-muted-foreground">
                      Processing all processes of the same generation (same depth) together. 
                      Useful for analyzing process tree by "generation" of forks.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Insights */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Key Insights for Exams/Viva</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge className="shrink-0 mt-0.5">1</Badge>
                    <p className="text-sm text-muted-foreground">
                      <strong>n consecutive fork() calls create 2ⁿ processes</strong> - 
                      This is equivalent to a complete binary tree doubling at each level.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="shrink-0 mt-0.5">2</Badge>
                    <p className="text-sm text-muted-foreground">
                      <strong>The process tree is always a valid tree structure</strong> - 
                      Each node has exactly one parent (except root), no cycles.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="shrink-0 mt-0.5">3</Badge>
                    <p className="text-sm text-muted-foreground">
                      <strong>Orphan adoption = re-parenting to root</strong> - 
                      When any internal node exits, its children move to init (root).
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="shrink-0 mt-0.5">4</Badge>
                    <p className="text-sm text-muted-foreground">
                      <strong>Zombie ≠ Orphan</strong> - 
                      Zombie: terminated child, living parent. Orphan: running child, dead parent.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="shrink-0 mt-0.5">5</Badge>
                    <p className="text-sm text-muted-foreground">
                      <strong>Tree degree = max children per process</strong> - 
                      Each fork() increases the parent's degree by 1.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Theory;
