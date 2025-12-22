import { useState, useCallback, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDSATree, DSANode } from '@/hooks/useDSATree';
import { useProcessTree } from '@/hooks/useProcessTree';
import { UnifiedTreeVisualization } from '@/components/UnifiedTreeVisualization';
import { dsaTreeToUnifiedTree, getTreeStats, osTreeConcepts } from '@/utils/treeConversions';
import { UnifiedTreeNode } from '@/types/tree';
import { 
  Play, SkipForward, SkipBack, RotateCcw, Plus, Trash2, TreeDeciduous, 
  Download, GitFork, Info, Cpu, BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

const DSATree = () => {
  const {
    root,
    selectedNode,
    maxDegree,
    setSelectedNode,
    setMaxDegree,
    createRoot,
    addChild,
    deleteNode,
    getNodeInfo,
    preorder,
    postorder,
    levelOrder,
    inorder,
    reset,
    importFromProcessTree
  } = useDSATree();

  const { root: processRoot, forkAllProcesses, createRootProcess, resetTree: resetProcessTree } = useProcessTree();

  const [newValue, setNewValue] = useState<string>('');
  const [traversalResult, setTraversalResult] = useState<DSANode[]>([]);
  const [currentTraversalIndex, setCurrentTraversalIndex] = useState(-1);
  const [activeTraversal, setActiveTraversal] = useState<string | null>(null);
  const [showOSConcepts, setShowOSConcepts] = useState(false);

  const handleCreateRoot = () => {
    const value = parseInt(newValue) || 1;
    createRoot(value);
    setNewValue('');
  };

  const handleAddChild = () => {
    if (!selectedNode) return;
    const value = parseInt(newValue) || (Math.max(...(root ? getAllValues(root) : [0])) + 1);
    addChild(selectedNode.id, value);
    setNewValue('');
  };

  const getAllValues = (node: DSANode): number[] => {
    return [node.value, ...node.children.flatMap(getAllValues)];
  };

  const handleTraversal = (type: string) => {
    if (!root) return;
    let result: DSANode[] = [];
    switch (type) {
      case 'preorder': result = preorder(root); break;
      case 'postorder': result = postorder(root); break;
      case 'levelorder': result = levelOrder(root); break;
      case 'inorder': result = inorder(root); break;
    }
    setTraversalResult(result);
    setCurrentTraversalIndex(-1);
    setActiveTraversal(type);
  };

  const nextStep = () => {
    if (currentTraversalIndex < traversalResult.length - 1) {
      setCurrentTraversalIndex(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentTraversalIndex >= 0) {
      setCurrentTraversalIndex(prev => prev - 1);
    }
  };

  const resetTraversal = () => {
    setTraversalResult([]);
    setCurrentTraversalIndex(-1);
    setActiveTraversal(null);
  };

  // Import OS tree
  const handleImportOSTree = () => {
    if (processRoot) {
      importFromProcessTree(processRoot);
      setShowOSConcepts(true);
      toast.success('OS process tree imported as DSA tree');
    } else {
      // Create a sample process tree
      createRootProcess();
      toast.info('Created a root process. Fork some processes, then import again.');
    }
  };

  // Quick demo: create process tree with 3 forks
  const handleQuickDemo = () => {
    resetProcessTree();
    setTimeout(() => {
      createRootProcess();
      setTimeout(() => {
        forkAllProcesses();
        setTimeout(() => {
          forkAllProcesses();
          setTimeout(() => {
            if (processRoot) {
              importFromProcessTree(processRoot);
              setShowOSConcepts(true);
              toast.success('Demo: 3-level process tree imported');
            }
          }, 100);
        }, 100);
      }, 100);
    }, 100);
  };

  const nodeInfo = selectedNode ? getNodeInfo(selectedNode) : null;
  const currentHighlightId = currentTraversalIndex >= 0 ? traversalResult[currentTraversalIndex]?.id : null;

  // Convert DSA tree to unified format for visualization
  const unifiedRoot: UnifiedTreeNode | null = root ? dsaTreeToUnifiedTree(root) : null;
  const treeStats = getTreeStats(unifiedRoot);

  // Handle node selection from unified tree
  const handleNodeSelect = useCallback((unifiedNode: UnifiedTreeNode) => {
    // Find the corresponding DSA node
    const findDSANode = (node: DSANode | null, id: string): DSANode | null => {
      if (!node) return null;
      if (node.id === id) return node;
      for (const child of node.children) {
        const found = findDSANode(child, id);
        if (found) return found;
      }
      return null;
    };
    const dsaNode = findDSANode(root, unifiedNode.id);
    if (dsaNode) setSelectedNode(dsaNode);
  }, [root, setSelectedNode]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container py-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">DSA Tree Visualizer</h1>
          <p className="text-muted-foreground">
            Build N-ary trees, explore traversals, and connect to OS process concepts
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <Tabs defaultValue="build" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="build">Build</TabsTrigger>
                <TabsTrigger value="os">OS Import</TabsTrigger>
              </TabsList>
              
              <TabsContent value="build" className="space-y-4">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TreeDeciduous className="w-4 h-4" /> Tree Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Value"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        className="w-20"
                      />
                      {!root ? (
                        <Button onClick={handleCreateRoot} className="flex-1 gap-2">
                          <Plus className="w-4 h-4" /> Create Root
                        </Button>
                      ) : (
                        <Button onClick={handleAddChild} disabled={!selectedNode} className="flex-1 gap-2">
                          <Plus className="w-4 h-4" /> Add Child
                        </Button>
                      )}
                    </div>
                    <Button
                      onClick={() => selectedNode && deleteNode(selectedNode.id)}
                      disabled={!selectedNode}
                      variant="outline"
                      className="w-full gap-2 text-destructive"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Node
                    </Button>
                    <Button onClick={reset} variant="outline" className="w-full gap-2">
                      <RotateCcw className="w-4 h-4" /> Reset Tree
                    </Button>

                    <div className="pt-2">
                      <label className="text-xs text-muted-foreground flex justify-between mb-2">
                        <span>Max Degree</span>
                        <span className="font-mono">{maxDegree}</span>
                      </label>
                      <Slider
                        value={[maxDegree]}
                        onValueChange={(v) => setMaxDegree(v[0])}
                        min={2}
                        max={10}
                        step={1}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="os" className="space-y-4">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Cpu className="w-4 h-4" /> OS Process Import
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Import your OS process tree as a DSA tree
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      onClick={handleImportOSTree} 
                      className="w-full gap-2"
                      disabled={!processRoot}
                    >
                      <Download className="w-4 h-4" /> Import Process Tree
                    </Button>
                    <Button 
                      onClick={handleQuickDemo} 
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <GitFork className="w-4 h-4" /> Quick Demo (3 Forks)
                    </Button>
                    
                    {processRoot && (
                      <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                        <p>Process tree available with {getTreeStats(dsaTreeToUnifiedTree({
                          id: `pid-${processRoot.pid}`,
                          value: processRoot.pid,
                          children: [],
                          depth: 0,
                          parentId: null
                        })).totalNodes} nodes</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Traversals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {['preorder', 'postorder', 'inorder', 'levelorder'].map((type) => (
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
              </CardContent>
            </Card>

            {activeTraversal && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Traversal Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Button onClick={prevStep} size="sm" variant="outline" disabled={currentTraversalIndex < 0}>
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button onClick={nextStep} size="sm" className="flex-1" disabled={currentTraversalIndex >= traversalResult.length - 1}>
                      <Play className="w-4 h-4 mr-2" /> Next
                    </Button>
                    <Button onClick={nextStep} size="sm" variant="outline" disabled={currentTraversalIndex >= traversalResult.length - 1}>
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button onClick={resetTraversal} size="sm" variant="ghost" className="w-full">
                    Reset Traversal
                  </Button>
                  <div className="flex flex-wrap gap-1">
                    {traversalResult.slice(0, currentTraversalIndex + 1).map((n, i) => (
                      <Badge key={i} variant="secondary" className="font-mono">
                        {n.value}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tree Statistics */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="w-4 h-4" /> Tree Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Nodes:</span> <span className="font-mono">{treeStats.totalNodes}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Height:</span> <span className="font-mono">{treeStats.height}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Max Degree:</span> <span className="font-mono">{treeStats.maxDegree}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Leaf Nodes:</span> <span className="font-mono">{treeStats.leafCount}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Internal Nodes:</span> <span className="font-mono">{treeStats.internalNodes}</span></div>
              </CardContent>
            </Card>

            {nodeInfo && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Node Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Value (PID):</span> <span className="font-mono">{nodeInfo.value}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Depth:</span> <span className="font-mono">{nodeInfo.depth}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Height:</span> <span className="font-mono">{nodeInfo.height}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Parent:</span> <span className="font-mono">{nodeInfo.parent ?? 'None (Root)'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Degree:</span> <span className="font-mono">{nodeInfo.degree}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtree Size:</span> <span className="font-mono">{nodeInfo.subtreeSize}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Is Leaf:</span> <span className="font-mono">{nodeInfo.isLeaf ? 'Yes' : 'No'}</span></div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tree Visualization */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-card border border-border rounded-xl min-h-[400px] p-4 overflow-auto">
              {!root ? (
                <div className="flex items-center justify-center h-full text-muted-foreground min-h-[350px]">
                  <div className="text-center">
                    <TreeDeciduous className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="mb-2">Create a root node to start building your tree</p>
                    <p className="text-sm">Or import an OS process tree from the "OS Import" tab</p>
                  </div>
                </div>
              ) : (
                <UnifiedTreeVisualization
                  root={unifiedRoot}
                  selectedNodeId={selectedNode?.id || null}
                  highlightedNodeId={currentHighlightId}
                  visitedNodeIds={traversalResult.map(n => n.id)}
                  currentVisitIndex={currentTraversalIndex}
                  onSelectNode={handleNodeSelect}
                  showOSInfo={showOSConcepts}
                />
              )}
            </div>

            {/* OS Concepts Panel */}
            {showOSConcepts && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> OS ↔ DSA Connection
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Understanding how process trees relate to data structures
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3">
                    {Object.values(osTreeConcepts).map((concept, i) => (
                      <div key={i} className="p-3 bg-muted/50 rounded-lg">
                        <h4 className="font-semibold text-sm mb-1">{concept.title}</h4>
                        <p className="text-xs text-muted-foreground">{concept.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DSATree;
