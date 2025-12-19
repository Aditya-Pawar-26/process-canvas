import { Navigation } from '@/components/Navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitFork, Clock, XCircle, Skull, User, TreeDeciduous } from 'lucide-react';

const Theory = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Theory & Concepts</h1>
          <p className="text-muted-foreground">
            Reference material for OS process management and tree data structures
          </p>
        </div>

        <Tabs defaultValue="os" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="os">OS Concepts</TabsTrigger>
            <TabsTrigger value="dsa">DSA Concepts</TabsTrigger>
          </TabsList>

          <TabsContent value="os">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="fork" className="bg-card border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <GitFork className="w-5 h-5 text-primary" />
                    <span>fork() System Call</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  <p className="mb-3">The fork() system call creates a new process by duplicating the calling process.</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Returns 0 to child process</li>
                    <li>Returns child's PID to parent</li>
                    <li>Returns -1 on error</li>
                    <li>Child gets copy of parent's memory space</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="wait" className="bg-card border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-process-waiting" />
                    <span>wait() System Call</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  <p className="mb-3">The wait() call suspends the parent until one of its children terminates.</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Blocks parent process execution</li>
                    <li>Retrieves child exit status</li>
                    <li>Prevents zombie processes</li>
                    <li>waitpid() for specific child</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="zombie" className="bg-card border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Skull className="w-5 h-5 text-process-zombie" />
                    <span>Zombie Process</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  <p className="mb-3">A zombie is a process that has completed but still has an entry in the process table.</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Child exits before parent calls wait()</li>
                    <li>Entry kept for parent to read exit status</li>
                    <li>Consumes system resources</li>
                    <li>Cleaned up when parent reads status or terminates</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="orphan" className="bg-card border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <span>Orphan Process</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  <p className="mb-3">An orphan is a process whose parent has terminated.</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Adopted by init process (PID 1)</li>
                    <li>PPID changes to 1</li>
                    <li>Continues execution normally</li>
                    <li>init will wait() and clean up</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="dsa">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="tree" className="bg-card border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <TreeDeciduous className="w-5 h-5 text-primary" />
                    <span>Tree Data Structure</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  <p className="mb-3">A tree is a hierarchical data structure with nodes connected by edges.</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Root: topmost node (like init process)</li>
                    <li>Parent: node with children</li>
                    <li>Leaf: node without children</li>
                    <li>Depth: distance from root</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="preorder" className="bg-card border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">Preorder Traversal</AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  <p className="mb-3">Visit: Root → Left → Right</p>
                  <p className="text-sm">OS analogy: Parent process runs before spawning children.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="postorder" className="bg-card border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">Postorder Traversal</AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  <p className="mb-3">Visit: Left → Right → Root</p>
                  <p className="text-sm">OS analogy: Like wait() - children complete before parent continues.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="levelorder" className="bg-card border border-border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline">Level Order Traversal</AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  <p className="mb-3">Visit all nodes level by level, left to right.</p>
                  <p className="text-sm">OS analogy: Processing all processes at same generation before next.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Theory;
