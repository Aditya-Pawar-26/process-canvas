import { useState, useCallback } from 'react';
import { ProcessNode, TraversalType, TraversalStep } from '@/types/process';

export const useTraversal = () => {
  const [traversalPath, setTraversalPath] = useState<TraversalStep[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  const preorder = useCallback((node: ProcessNode | null, order: { value: number } = { value: 0 }): TraversalStep[] => {
    if (!node) return [];
    const steps: TraversalStep[] = [{ nodeId: node.id, order: order.value++ }];
    for (const child of node.children) {
      steps.push(...preorder(child, order));
    }
    return steps;
  }, []);

  const postorder = useCallback((node: ProcessNode | null, order: { value: number } = { value: 0 }): TraversalStep[] => {
    if (!node) return [];
    const steps: TraversalStep[] = [];
    for (const child of node.children) {
      steps.push(...postorder(child, order));
    }
    steps.push({ nodeId: node.id, order: order.value++ });
    return steps;
  }, []);

  const levelorder = useCallback((node: ProcessNode | null): TraversalStep[] => {
    if (!node) return [];
    const steps: TraversalStep[] = [];
    const queue: ProcessNode[] = [node];
    let order = 0;

    while (queue.length > 0) {
      const current = queue.shift()!;
      steps.push({ nodeId: current.id, order: order++ });
      queue.push(...current.children);
    }

    return steps;
  }, []);

  const startTraversal = useCallback((root: ProcessNode | null, type: TraversalType) => {
    if (!root) return;

    let steps: TraversalStep[];
    switch (type) {
      case 'preorder':
        steps = preorder(root);
        break;
      case 'postorder':
        steps = postorder(root);
        break;
      case 'levelorder':
        steps = levelorder(root);
        break;
      default:
        steps = [];
    }

    setTraversalPath(steps);
    setCurrentStep(-1);
    setIsPlaying(false);
  }, [preorder, postorder, levelorder]);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, traversalPath.length - 1));
  }, [traversalPath.length]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, -1));
  }, []);

  const resetTraversal = useCallback(() => {
    setTraversalPath([]);
    setCurrentStep(-1);
    setIsPlaying(false);
  }, []);

  const getVisitedNodes = useCallback(() => {
    if (currentStep < 0) return [];
    return traversalPath.slice(0, currentStep + 1);
  }, [traversalPath, currentStep]);

  const getCurrentNodeId = useCallback(() => {
    if (currentStep < 0 || currentStep >= traversalPath.length) return null;
    return traversalPath[currentStep].nodeId;
  }, [traversalPath, currentStep]);

  return {
    traversalPath,
    currentStep,
    isPlaying,
    setIsPlaying,
    startTraversal,
    nextStep,
    prevStep,
    resetTraversal,
    getVisitedNodes,
    getCurrentNodeId,
  };
};
