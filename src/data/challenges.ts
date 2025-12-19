import { Challenge } from '@/types/process';

export const challenges: Challenge[] = [
  {
    id: 'challenge-1',
    title: 'Create a Child',
    description: 'Create a simple parent-child process relationship',
    objective: 'Use fork() to create exactly one child process',
    expectedTree: 'root with 1 child',
    timeLimit: 30,
    difficulty: 'beginner',
  },
  {
    id: 'challenge-2',
    title: 'Three Children',
    description: 'Create a parent with exactly three children',
    objective: 'Fork three times from the root process',
    expectedTree: 'root with 3 children',
    timeLimit: 45,
    difficulty: 'beginner',
  },
  {
    id: 'challenge-3',
    title: 'Create a Zombie',
    description: 'Demonstrate zombie process creation',
    objective: 'Create a child and have it exit without the parent waiting',
    expectedTree: 'root with 1 zombie child',
    timeLimit: 45,
    difficulty: 'intermediate',
  },
  {
    id: 'challenge-4',
    title: 'Proper Cleanup',
    description: 'Create children and properly wait for them',
    objective: 'Create 2 children, wait for each, no zombies',
    expectedTree: 'root with 2 terminated children',
    timeLimit: 60,
    difficulty: 'intermediate',
  },
  {
    id: 'challenge-5',
    title: 'Binary Tree',
    description: 'Create a perfect binary tree of depth 2',
    objective: 'Each process forks exactly twice',
    expectedTree: 'binary tree depth 2',
    timeLimit: 90,
    difficulty: 'advanced',
  },
  {
    id: 'challenge-6',
    title: 'Chain of Processes',
    description: 'Create a linear chain of 4 processes',
    objective: 'Each child creates one grandchild, forming a chain',
    expectedTree: 'linear chain depth 4',
    timeLimit: 90,
    difficulty: 'advanced',
  },
];

export const getChallengeById = (id: string): Challenge | undefined => {
  return challenges.find(c => c.id === id);
};

export const getChallengesByDifficulty = (difficulty: Challenge['difficulty']): Challenge[] => {
  return challenges.filter(c => c.difficulty === difficulty);
};
