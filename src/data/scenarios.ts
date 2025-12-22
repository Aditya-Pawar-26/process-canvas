import { Scenario } from '@/types/process';

export const scenarios: Scenario[] = [
  {
    id: 'single-fork',
    title: 'Single Fork',
    description: 'Basic fork() call - process duplication',
    osConcept: 'fork() System Call',
    dsaConcept: 'Tree Node Creation',
    difficulty: 'beginner',
    code: `pid_t pid = fork();
if (pid == 0) {
    // Child process (fork returns 0)
    printf("Child: PID = %d\\n", getpid());
} else {
    // Parent process (fork returns child PID)
    printf("Parent: PID = %d\\n", getpid());
}`,
    steps: [
      {
        action: 'fork',
        description: 'Parent process duplicates itself via fork()',
        osExplanation: 'fork() creates an exact copy of the calling process. Returns child PID to parent, 0 to child. Both processes continue execution from fork().',
        dsaExplanation: 'A new child node is added to the parent. The tree grows by one node per fork() call.',
      },
    ],
  },
  {
    id: 'multiple-fork',
    title: 'Multiple Fork (Exponential)',
    description: 'Each fork() doubles the total process count',
    osConcept: 'Exponential Process Growth',
    dsaConcept: 'Binary Tree Expansion',
    difficulty: 'beginner',
    code: `fork(); // All processes execute this
fork(); // Now 2 processes each fork
fork(); // Now 4 processes each fork
// Result: 2^3 = 8 processes`,
    steps: [
      {
        action: 'fork',
        description: 'First fork() - process count: 1 → 2',
        osExplanation: 'First fork() duplicates the single process. Now 2 processes exist (parent + child).',
        dsaExplanation: 'Root node creates one child. Total nodes = 2.',
      },
      {
        action: 'fork',
        description: 'Second fork() - process count: 2 → 4',
        osExplanation: 'BOTH existing processes execute fork(). Each creates one child. Total = 4.',
        dsaExplanation: 'Each existing node creates one child. Total nodes = 4.',
      },
      {
        action: 'fork',
        description: 'Third fork() - process count: 4 → 8',
        osExplanation: 'All 4 processes execute fork(). Each creates one child. Total = 2³ = 8.',
        dsaExplanation: 'Each existing node creates one child. Total nodes = 8.',
      },
    ],
  },
  {
    id: 'parent-wait',
    title: 'Parent Wait',
    description: 'Parent waits for child to complete - prevents zombie',
    osConcept: 'wait() System Call',
    dsaConcept: 'Postorder Traversal',
    difficulty: 'beginner',
    code: `pid_t pid = fork();
if (pid == 0) {
    // Child work
    sleep(1);
    exit(0);  // Child terminates
} else {
    wait(NULL);  // Parent blocks until child exits
    printf("Child completed\\n");
}`,
    steps: [
      {
        action: 'fork',
        description: 'Create child process',
        osExplanation: 'fork() creates child. Parent continues, child also continues from fork().',
        dsaExplanation: 'New leaf node created under parent.',
      },
      {
        action: 'wait',
        description: 'Parent calls wait() - blocks until child exits',
        osExplanation: 'wait() blocks parent until ANY child terminates. Collects exit status, preventing zombie.',
        dsaExplanation: 'Like postorder traversal: children processed before parent can continue.',
      },
      {
        action: 'exit',
        description: 'Child exits - parent is waiting',
        osExplanation: 'Child terminates NORMALLY because parent called wait(). No zombie created.',
        dsaExplanation: 'Leaf node removed cleanly from tree.',
      },
    ],
  },
  {
    id: 'zombie-process',
    title: 'Zombie Process',
    description: 'Child exits but parent does NOT call wait() → ZOMBIE',
    osConcept: 'Zombie Process State',
    dsaConcept: 'Orphaned Node Reference',
    difficulty: 'intermediate',
    code: `pid_t pid = fork();
if (pid == 0) {
    exit(0);  // Child exits immediately
} else {
    // Parent does NOT call wait()!
    sleep(10);  // Parent keeps running
}
// Child is now a ZOMBIE until parent calls wait()`,
    steps: [
      {
        action: 'fork',
        description: 'Create child process',
        osExplanation: 'fork() creates child process. Both parent and child are now running.',
        dsaExplanation: 'New child node added to parent.',
      },
      {
        action: 'exit',
        targetPid: -1,
        description: 'Child exits - but parent is NOT waiting!',
        osExplanation: '⚠️ ZOMBIE CREATED: Child has TERMINATED but parent never called wait(). Process entry remains in kernel table until parent collects exit status.',
        dsaExplanation: 'Node is marked "dead" but remains in tree - parent still holds reference.',
      },
    ],
  },
  {
    id: 'orphan-process',
    title: 'Orphan Process',
    description: 'Parent exits while child is STILL RUNNING → ORPHAN',
    osConcept: 'Orphan Process (Adopted by init)',
    dsaConcept: 'Parent Node Deletion + Reparenting',
    difficulty: 'intermediate',
    code: `pid_t pid = fork();
if (pid == 0) {
    sleep(5);  // Child keeps running
    printf("Orphan: PPID is now 1 (init)\\n");
} else {
    exit(0);  // Parent exits immediately!
}
// Child is now an ORPHAN - adopted by init (PID 1)`,
    steps: [
      {
        action: 'fork',
        description: 'Create child process',
        osExplanation: 'fork() creates child. Both processes are running.',
        dsaExplanation: 'Child node attached to parent.',
      },
      {
        action: 'orphan',
        description: 'Parent exits while child is STILL RUNNING',
        osExplanation: '⚠️ ORPHAN CREATED: Child is STILL RUNNING but parent exited. Kernel adopts child to init (PID 1). Child\'s PPID changes to 1.',
        dsaExplanation: 'Parent node removed. Child node reparented to root (init).',
      },
    ],
  },
  {
    id: 'recursive-fork',
    title: 'Recursive Forking',
    description: 'Each child creates its own child - forms a chain',
    osConcept: 'Recursive fork() Pattern',
    dsaConcept: 'Linear Tree (Linked List)',
    difficulty: 'advanced',
    code: `void recursive_fork(int depth) {
    if (depth <= 0) return;
    if (fork() == 0) {
        // Only child recurses
        recursive_fork(depth - 1);
        exit(0);
    }
    wait(NULL);  // Parent waits for child
}
recursive_fork(3);`,
    steps: [
      {
        action: 'fork',
        description: 'Level 1: Root creates first child',
        osExplanation: 'Root process forks. Child will recursively call fork() again.',
        dsaExplanation: 'First level of tree: root → child₁',
      },
      {
        action: 'fork',
        description: 'Level 2: First child creates second child',
        osExplanation: 'Child₁ forks to create Child₂. Forms a chain.',
        dsaExplanation: 'Second level: root → child₁ → child₂',
      },
      {
        action: 'fork',
        description: 'Level 3: Second child creates third child',
        osExplanation: 'Child₂ forks to create Child₃. Maximum depth reached.',
        dsaExplanation: 'Third level (chain): root → child₁ → child₂ → child₃',
      },
    ],
  },
];

export const getScenarioById = (id: string): Scenario | undefined => {
  return scenarios.find(s => s.id === id);
};

export const getScenariosByDifficulty = (difficulty: Scenario['difficulty']): Scenario[] => {
  return scenarios.filter(s => s.difficulty === difficulty);
};
