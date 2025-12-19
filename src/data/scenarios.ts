import { Scenario } from '@/types/process';

export const scenarios: Scenario[] = [
  {
    id: 'single-fork',
    title: 'Single Fork',
    description: 'Basic fork() call creating one child process',
    osConcept: 'fork() System Call',
    dsaConcept: 'Tree Node Creation',
    difficulty: 'beginner',
    code: `pid_t pid = fork();
if (pid == 0) {
    // Child process
    printf("Child: PID = %d\\n", getpid());
} else {
    // Parent process
    printf("Parent: PID = %d\\n", getpid());
}`,
    steps: [
      {
        action: 'fork',
        description: 'Parent calls fork() to create child',
        osExplanation: 'fork() duplicates the current process, creating a new child with a unique PID',
        dsaExplanation: 'A new node is created and added as a child of the current node',
      },
    ],
  },
  {
    id: 'multiple-fork',
    title: 'Multiple Fork',
    description: 'Parent creates multiple children sequentially',
    osConcept: 'Multiple fork() Calls',
    dsaConcept: 'Multi-child Tree Node',
    difficulty: 'beginner',
    code: `for (int i = 0; i < 3; i++) {
    pid_t pid = fork();
    if (pid == 0) {
        printf("Child %d created\\n", i);
        exit(0);
    }
}`,
    steps: [
      {
        action: 'fork',
        description: 'First fork() call',
        osExplanation: 'First child process created',
        dsaExplanation: 'First child node added to parent',
      },
      {
        action: 'fork',
        description: 'Second fork() call',
        osExplanation: 'Second child process created',
        dsaExplanation: 'Second child node added to parent',
      },
      {
        action: 'fork',
        description: 'Third fork() call',
        osExplanation: 'Third child process created',
        dsaExplanation: 'Third child node added to parent',
      },
    ],
  },
  {
    id: 'parent-wait',
    title: 'Parent Wait',
    description: 'Parent waits for child to complete',
    osConcept: 'wait() System Call',
    dsaConcept: 'Postorder Traversal',
    difficulty: 'beginner',
    code: `pid_t pid = fork();
if (pid == 0) {
    // Child work
    sleep(1);
    exit(0);
} else {
    wait(NULL);
    printf("Child completed\\n");
}`,
    steps: [
      {
        action: 'fork',
        description: 'Create child process',
        osExplanation: 'fork() creates a new child process',
        dsaExplanation: 'New node created as child',
      },
      {
        action: 'wait',
        description: 'Parent waits for child',
        osExplanation: 'Parent blocks until child terminates',
        dsaExplanation: 'Similar to postorder: process children before parent continues',
      },
      {
        action: 'exit',
        description: 'Child exits',
        osExplanation: 'Child terminates and parent is notified',
        dsaExplanation: 'Leaf node processed and removed',
      },
    ],
  },
  {
    id: 'zombie-process',
    title: 'Zombie Process',
    description: 'Child becomes zombie when parent does not wait',
    osConcept: 'Zombie Process State',
    dsaConcept: 'Orphaned Node',
    difficulty: 'intermediate',
    code: `pid_t pid = fork();
if (pid == 0) {
    exit(0);  // Child exits immediately
} else {
    // Parent does NOT call wait()
    sleep(10);
}`,
    steps: [
      {
        action: 'fork',
        description: 'Create child process',
        osExplanation: 'fork() creates child',
        dsaExplanation: 'New child node added',
      },
      {
        action: 'exit',
        targetPid: -1,
        description: 'Child exits without parent waiting',
        osExplanation: 'Child becomes ZOMBIE - process entry remains in table',
        dsaExplanation: 'Node marked but not removed from tree',
      },
    ],
  },
  {
    id: 'orphan-process',
    title: 'Orphan Process',
    description: 'Parent exits before child, child becomes orphan',
    osConcept: 'Orphan Process',
    dsaConcept: 'Parent Node Deletion',
    difficulty: 'intermediate',
    code: `pid_t pid = fork();
if (pid == 0) {
    sleep(5);  // Child sleeps
    printf("Orphan: Parent is init\\n");
} else {
    exit(0);  // Parent exits immediately
}`,
    steps: [
      {
        action: 'fork',
        description: 'Create child process',
        osExplanation: 'fork() creates child',
        dsaExplanation: 'Child node created',
      },
      {
        action: 'exit',
        description: 'Parent exits before child',
        osExplanation: 'Child is adopted by init process (PID 1)',
        dsaExplanation: 'Node re-parented to root',
      },
    ],
  },
  {
    id: 'recursive-fork',
    title: 'Recursive Forking',
    description: 'Each child creates its own child - tree depth',
    osConcept: 'Recursive fork()',
    dsaConcept: 'Tree Depth / Linked Structure',
    difficulty: 'advanced',
    code: `void recursive_fork(int depth) {
    if (depth <= 0) return;
    if (fork() == 0) {
        recursive_fork(depth - 1);
        exit(0);
    }
    wait(NULL);
}
recursive_fork(3);`,
    steps: [
      {
        action: 'fork',
        description: 'Level 1: First fork',
        osExplanation: 'Root creates child at depth 1',
        dsaExplanation: 'First level of tree created',
      },
      {
        action: 'fork',
        description: 'Level 2: Child forks',
        osExplanation: 'Child creates grandchild',
        dsaExplanation: 'Second level of tree created',
      },
      {
        action: 'fork',
        description: 'Level 3: Grandchild forks',
        osExplanation: 'Grandchild creates great-grandchild',
        dsaExplanation: 'Third level - max depth reached',
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
