import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { TreeVisualization } from '@/components/TreeVisualization';
import { useProcessTree } from '@/hooks/useProcessTree';
import { useTraversal } from '@/hooks/useTraversal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TraversalType } from '@/types/process';
import { Play, SkipForward, SkipBack, RotateCcw, TreeDeciduous } from 'lucide-react';

const DSATree = () => {
  const { root, createRootProcess, forkProcess, resetTree, selectedNode, setSelectedNode } = useProcessTree();
  const { traversalPath, currentStep, startTraversal, nextStep, prevStep, resetTraversal, getCurrentNodeId } = useTraversal();
  const [activeTraversal, setActiveTraversal] = useState<TraversalType | null>(null);

  const handleTraversal = (type: TraversalType) => {
    if (!root) return;
    setActiveTraversal(type);
    startTraversal(root, type);
  };

  const createSampleTree = () => {
    resetTree();
    setTimeout(() => {
      const r = createRootProcess();
      if (r) {
        setTimeout(() => {
          forkProcess(r.pid);
          forkProcess(r.pid);
          forkProcess(r.pid);
        }, 100);
      }
    }, 100);
  };

  const getVisitedOrder = () => {
    if (currentStep < 0) return [];
    return traversalPath.slice(0, currentStep + 1).map((s, i) => i + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">DSA Tree Visualization</h1>
          <p className="text-muted-foreground">
            Focus on tree traversal algorithms: Preorder, Postorder, Level Order
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold mb-4">Tree Controls</h3>
              <div className="space-y-2">
                <Button onClick={createSampleTree} className="w-full gap-2" variant="outline">
                  <TreeDeciduous className="w-4 h-4" />
                  Create Sample Tree
                </Button>
                <Button onClick={resetTree} className="w-full gap-2" variant="outline">
                  <RotateCcw className="w-4 h-4" />
                  Reset Tree
                </Button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold mb-4">Traversal Algorithms</h3>
              <div className="space-y-2">
                {(['preorder', 'postorder', 'levelorder'] as TraversalType[]).map((type) => (
                  <Button
                    key={type}
                    onClick={() => handleTraversal(type)}
                    variant={activeTraversal === type ? 'default' : 'outline'}
                    className="w-full capitalize"
                    disabled={!root}
                  >
                    {type === 'levelorder' ? 'Level Order' : type}
                  </Button>
                ))}
              </div>
            </div>

            {activeTraversal && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold mb-4">Traversal Controls</h3>
                <div className="flex gap-2 mb-4">
                  <Button onClick={prevStep} size="sm" variant="outline" disabled={currentStep < 0}>
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button onClick={nextStep} size="sm" className="flex-1" disabled={currentStep >= traversalPath.length - 1}>
                    <Play className="w-4 h-4 mr-2" />
                    Next
                  </Button>
                  <Button onClick={nextStep} size="sm" variant="outline" disabled={currentStep >= traversalPath.length - 1}>
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>
                <Button onClick={() => { resetTraversal(); setActiveTraversal(null); }} size="sm" variant="ghost" className="w-full">
                  Reset Traversal
                </Button>
              </div>
            )}

            {/* Output */}
            {traversalPath.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold mb-2">Visited Order</h3>
                <div className="flex flex-wrap gap-1">
                  {getVisitedOrder().map((order, i) => (
                    <Badge key={i} variant="secondary" className="font-mono">
                      {order}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tree Visualization */}
          <div className="lg:col-span-3 bg-card border border-border rounded-xl min-h-[500px]">
            <TreeVisualization
              root={root}
              selectedNode={selectedNode}
              highlightedNodeId={getCurrentNodeId()}
              onSelectNode={setSelectedNode}
              onFork={(pid) => forkProcess(pid)}
              onWait={() => {}}
              onExit={() => {}}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DSATree;
