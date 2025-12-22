import { useState, useCallback } from 'react';
import { ProcessNode } from '@/types/process';

export interface DSANode {
  id: string;
  value: number;
  children: DSANode[];
  depth: number;
  parentId: string | null;
}

export interface NodeInfo {
  value: number;
  depth: number;
  height: number;
  parent: number | null;
  childrenCount: number;
  subtreeSize: number;
  isLeaf: boolean;
  degree: number;
}

let nodeCounter = 0;
const generateNodeId = () => `node-${++nodeCounter}`;

export const useDSATree = () => {
  const [root, setRoot] = useState<DSANode | null>(null);
  const [selectedNode, setSelectedNode] = useState<DSANode | null>(null);
  const [maxDegree, setMaxDegree] = useState(10); // Allow arbitrary degree

  const createRoot = useCallback((value: number) => {
    nodeCounter = 0;
    const newRoot: DSANode = {
      id: generateNodeId(),
      value,
      children: [],
      depth: 0,
      parentId: null
    };
    setRoot(newRoot);
    setSelectedNode(newRoot);
    return newRoot;
  }, []);

  const findNode = useCallback((node: DSANode | null, id: string): DSANode | null => {
    if (!node) return null;
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  }, []);

  const updateNode = useCallback((
    node: DSANode,
    targetId: string,
    updater: (n: DSANode) => DSANode
  ): DSANode => {
    if (node.id === targetId) {
      return updater(node);
    }
    return {
      ...node,
      children: node.children.map(child => updateNode(child, targetId, updater))
    };
  }, []);

  const addChild = useCallback((parentId: string, value: number) => {
    if (!root) return null;
    
    const parent = findNode(root, parentId);
    if (!parent) return null;
    
    if (parent.children.length >= maxDegree) {
      return null; // Max children reached
    }
    
    const newChild: DSANode = {
      id: generateNodeId(),
      value,
      children: [],
      depth: parent.depth + 1,
      parentId: parent.id
    };
    
    setRoot(prev => {
      if (!prev) return prev;
      return updateNode(prev, parentId, (n) => ({
        ...n,
        children: [...n.children, newChild]
      }));
    });
    
    return newChild;
  }, [root, findNode, updateNode, maxDegree]);

  const deleteNode = useCallback((nodeId: string) => {
    if (!root) return;
    
    if (root.id === nodeId) {
      setRoot(null);
      setSelectedNode(null);
      return;
    }
    
    // Find parent and remove the node
    const removeFromParent = (node: DSANode): DSANode => {
      return {
        ...node,
        children: node.children
          .filter(child => child.id !== nodeId)
          .map(child => removeFromParent(child))
      };
    };
    
    setRoot(removeFromParent(root));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [root, selectedNode]);

  const updateValue = useCallback((nodeId: string, newValue: number) => {
    if (!root) return;
    
    setRoot(prev => {
      if (!prev) return prev;
      return updateNode(prev, nodeId, (n) => ({
        ...n,
        value: newValue
      }));
    });
  }, [root, updateNode]);

  const getHeight = useCallback((node: DSANode | null): number => {
    if (!node || node.children.length === 0) return 0;
    return 1 + Math.max(...node.children.map(getHeight));
  }, []);

  const getSubtreeSize = useCallback((node: DSANode | null): number => {
    if (!node) return 0;
    return 1 + node.children.reduce((sum, child) => sum + getSubtreeSize(child), 0);
  }, []);

  const getNodeInfo = useCallback((node: DSANode): NodeInfo => {
    const parentNode = node.parentId ? findNode(root, node.parentId) : null;
    
    return {
      value: node.value,
      depth: node.depth,
      height: getHeight(node),
      parent: parentNode?.value ?? null,
      childrenCount: node.children.length,
      subtreeSize: getSubtreeSize(node),
      isLeaf: node.children.length === 0,
      degree: node.children.length
    };
  }, [root, findNode, getHeight, getSubtreeSize]);

  const getAllNodes = useCallback((node: DSANode | null): DSANode[] => {
    if (!node) return [];
    return [node, ...node.children.flatMap(getAllNodes)];
  }, []);

  // Traversal algorithms
  const preorder = useCallback((node: DSANode | null): DSANode[] => {
    if (!node) return [];
    return [node, ...node.children.flatMap(child => preorder(child))];
  }, []);

  const postorder = useCallback((node: DSANode | null): DSANode[] => {
    if (!node) return [];
    return [...node.children.flatMap(child => postorder(child)), node];
  }, []);

  const levelOrder = useCallback((node: DSANode | null): DSANode[] => {
    if (!node) return [];
    const result: DSANode[] = [];
    const queue: DSANode[] = [node];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      queue.push(...current.children);
    }
    
    return result;
  }, []);

  const inorder = useCallback((node: DSANode | null): DSANode[] => {
    if (!node) return [];
    if (node.children.length === 0) return [node];
    
    const result: DSANode[] = [];
    const mid = Math.floor(node.children.length / 2);
    
    // Visit left half of children
    for (let i = 0; i < mid; i++) {
      result.push(...inorder(node.children[i]));
    }
    
    // Visit root
    result.push(node);
    
    // Visit right half of children
    for (let i = mid; i < node.children.length; i++) {
      result.push(...inorder(node.children[i]));
    }
    
    return result;
  }, []);

  const reset = useCallback(() => {
    nodeCounter = 0;
    setRoot(null);
    setSelectedNode(null);
  }, []);

  // Import OS process tree as DSA tree
  const importFromProcessTree = useCallback((processNode: ProcessNode) => {
    nodeCounter = 0;
    
    const convertNode = (pNode: ProcessNode, depth: number, parentId: string | null): DSANode => {
      const id = generateNodeId();
      const dsaNode: DSANode = {
        id,
        value: pNode.pid,
        children: [],
        depth,
        parentId,
      };
      
      dsaNode.children = pNode.children.map(child =>
        convertNode(child, depth + 1, id)
      );
      
      return dsaNode;
    };
    
    const newRoot = convertNode(processNode, 0, null);
    setRoot(newRoot);
    setSelectedNode(newRoot);
    return newRoot;
  }, []);

  return {
    root,
    selectedNode,
    maxDegree,
    setSelectedNode,
    setMaxDegree,
    createRoot,
    addChild,
    deleteNode,
    updateValue,
    findNode,
    getNodeInfo,
    getAllNodes,
    preorder,
    postorder,
    levelOrder,
    inorder,
    reset,
    importFromProcessTree
  };
};
