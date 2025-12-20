import { useState, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useDSATree, DSANode } from '@/hooks/useDSATree';
import { Play, SkipForward, SkipBack, RotateCcw, Plus, Trash2, TreeDeciduous } from 'lucide-react';

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
    reset
  } = useDSATree();

  const [newValue, setNewValue] = useState<string>('');
  const [traversalResult, setTraversalResult] = useState<DSANode[]>([]);
  const [currentTraversalIndex, setCurrentTraversalIndex] = useState(-1);
  const [activeTraversal, setActiveTraversal] = useState<string | null>(null);

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

  const nodeInfo = selectedNode ? getNodeInfo(selectedNode) : null;
  const currentHighlightId = currentTraversalIndex >= 0 ? traversalResult[currentTraversalIndex]?.id : null;

  const renderNode = useCallback((node: DSANode, x: number, y: number): JSX.Element => {
    const isSelected = selectedNode?.id === node.id;
    const isHighlighted = currentHighlightId === node.id;
    const visitedIndex = traversalResult.findIndex(n => n.id === node.id);
    const isVisited = visitedIndex >= 0 && visitedIndex <= currentTraversalIndex;

    return (
      <div key={node.id} className="flex flex-col items-center">
        <div
          onClick={() => setSelectedNode(node)}
          className={`
            w-14 h-14 rounded-full border-2 flex items-center justify-center cursor-pointer
            transition-all duration-300 font-mono font-bold text-lg
            ${isHighlighted ? 'border-primary bg-primary/30 scale-110 shadow-[0_0_20px_hsl(var(--primary)/0.5)]' : ''}
            ${isVisited && !isHighlighted ? 'border-process-running bg-process-running/20' : ''}
            ${!isVisited && !isHighlighted ? 'border-border bg-card hover:border-primary/50' : ''}
            ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
          `}
        >
          {node.value}
        </div>
        {isVisited && (
          <Badge variant="secondary" className="mt-1 text-xs">
            {visitedIndex + 1}
          </Badge>
        )}
        {node.children.length > 0 && (
          <>
            <div className="w-px h-6 bg-primary/40" />
            <div className="flex gap-6">
              {node.children.map((child) => renderNode(child, 0, 0))}
            </div>
          </>
        )}
      </div>
    );
  }, [selectedNode, currentHighlightId, traversalResult, currentTraversalIndex, setSelectedNode]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container py-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">DSA Tree Visualizer</h1>
          <p className="text-muted-foreground">
            Build custom N-ary trees and explore traversal algorithms
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Tree Controls</CardTitle>
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
                    max={6}
                    step={1}
                  />
                </div>
              </CardContent>
            </Card>

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

            {nodeInfo && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Node Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Value:</span> <span className="font-mono">{nodeInfo.value}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Depth:</span> <span className="font-mono">{nodeInfo.depth}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Height:</span> <span className="font-mono">{nodeInfo.height}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Parent:</span> <span className="font-mono">{nodeInfo.parent ?? 'None'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Children:</span> <span className="font-mono">{nodeInfo.childrenCount}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtree Size:</span> <span className="font-mono">{nodeInfo.subtreeSize}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Is Leaf:</span> <span className="font-mono">{nodeInfo.isLeaf ? 'Yes' : 'No'}</span></div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tree Visualization */}
          <div className="lg:col-span-3 bg-card border border-border rounded-xl min-h-[500px] flex items-center justify-center p-8">
            {!root ? (
              <div className="text-center text-muted-foreground">
                <TreeDeciduous className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Create a root node to start building your tree</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {renderNode(root, 0, 0)}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DSATree;
