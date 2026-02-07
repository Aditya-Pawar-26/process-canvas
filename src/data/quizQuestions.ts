export interface QuizQuestion {
  id: string;
  question: string;
  scenario?: string;
  options: string[];
  correctAnswer: number; // 0-indexed
  explanation: string;
  topic: 'zombie' | 'orphan' | 'wait' | 'exit' | 'fork' | 'init' | 'lifecycle';
}

export const quizQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'A child process exits while its parent is alive but has not called wait(). What will be the state of the child?',
    options: ['Running', 'Zombie', 'Orphan', 'Terminated'],
    correctAnswer: 1,
    explanation: 'A zombie is created because the parent is alive but has not called wait() to collect the exit status.',
    topic: 'zombie',
  },
  {
    id: 'q2',
    question: 'What happens when a parent process exits before its child process?',
    options: [
      'The child becomes a zombie',
      'The child is terminated immediately',
      'The child becomes an orphan and is adopted by init (PID 1)',
      'The child continues running with invalid PPID',
    ],
    correctAnswer: 2,
    explanation: 'When a parent exits, its running children become orphans and are re-parented to init (PID 1), which will reap them when they exit.',
    topic: 'orphan',
  },
  {
    id: 'q3',
    question: 'Can a process whose parent is init (PID 1) become a zombie?',
    options: [
      'Yes, always',
      'Yes, but only if it has children',
      'No, init always calls wait() immediately',
      'No, because init cannot have children',
    ],
    correctAnswer: 2,
    explanation: 'Init (PID 1) is designed to always reap its children immediately, so processes parented to init can never become zombies.',
    topic: 'init',
  },
  {
    id: 'q4',
    question: 'What is the primary purpose of the wait() system call?',
    options: [
      'To pause execution for a specified time',
      'To create a new child process',
      'To block until a child terminates and collect its exit status',
      'To terminate the calling process',
    ],
    correctAnswer: 2,
    explanation: 'wait() blocks the parent until a child terminates, then collects the child\'s exit status and removes the child from the process table.',
    topic: 'wait',
  },
  {
    id: 'q5',
    question: 'After fork() is called, what value is returned to the child process?',
    options: [
      'The parent\'s PID',
      'The child\'s own PID',
      '0',
      '-1',
    ],
    correctAnswer: 2,
    explanation: 'fork() returns 0 to the child process, while returning the child\'s PID to the parent. This allows each process to know its role.',
    topic: 'fork',
  },
  {
    id: 'q6',
    scenario: 'Process A (PID 100) forks Process B (PID 101). Process B calls exit() while Process A is in WAITING state.',
    question: 'What happens to Process B?',
    options: [
      'B becomes a zombie',
      'B becomes an orphan',
      'B is reaped immediately and terminated',
      'B continues running',
    ],
    correctAnswer: 2,
    explanation: 'Since the parent is waiting (has called wait()), the child is reaped immediately upon exit and transitions directly to terminated state.',
    topic: 'wait',
  },
  {
    id: 'q7',
    question: 'How many total processes exist after executing: fork(); fork();',
    options: ['2', '3', '4', '8'],
    correctAnswer: 2,
    explanation: 'The first fork() creates 2 processes. Each of those 2 processes then executes the second fork(), creating 4 total processes.',
    topic: 'fork',
  },
  {
    id: 'q8',
    question: 'What distinguishes a zombie process from a terminated process?',
    options: [
      'A zombie is still running',
      'A zombie\'s exit status has not been collected by its parent',
      'A zombie has no parent',
      'A zombie cannot be removed from the system',
    ],
    correctAnswer: 1,
    explanation: 'A zombie has finished execution but remains in the process table because its parent has not called wait() to collect its exit status.',
    topic: 'zombie',
  },
  {
    id: 'q9',
    scenario: 'Process P forks child C. Process P calls exit() without calling wait(). Child C is still running.',
    question: 'What is the state of Child C after Parent P exits?',
    options: [
      'Zombie',
      'Terminated',
      'Orphan (adopted by init)',
      'Waiting',
    ],
    correctAnswer: 2,
    explanation: 'When a parent exits, its running children become orphans and are re-parented to init (PID 1). C continues running as an orphan.',
    topic: 'orphan',
  },
  {
    id: 'q10',
    question: 'What happens if a parent calls wait() when it has no children?',
    options: [
      'The parent blocks forever',
      'The parent receives a zombie child',
      'wait() returns -1 immediately (error)',
      'A new child is created',
    ],
    correctAnswer: 2,
    explanation: 'If a process has no children, wait() returns -1 immediately with errno set to ECHILD, indicating no child processes exist.',
    topic: 'wait',
  },
  {
    id: 'q11',
    question: 'In which order do parent and child execute after fork()?',
    options: [
      'Parent always executes first',
      'Child always executes first',
      'Execution order is determined by the scheduler (non-deterministic)',
      'They execute simultaneously on different CPUs',
    ],
    correctAnswer: 2,
    explanation: 'After fork(), the execution order between parent and child is determined by the OS scheduler and is non-deterministic.',
    topic: 'fork',
  },
  {
    id: 'q12',
    scenario: 'A parent process has 3 running children. The parent calls wait() once.',
    question: 'How many children will be reaped?',
    options: [
      'All 3 children',
      'Only the first child that exits',
      'None until all 3 exit',
      'Depends on which child exits first',
    ],
    correctAnswer: 1,
    explanation: 'A single wait() call blocks until ONE child exits, then reaps that child and returns. To reap all 3, the parent must call wait() 3 times.',
    topic: 'wait',
  },
  {
    id: 'q13',
    question: 'What is the PPID of an orphan process?',
    options: [
      '0',
      '1 (init)',
      'Its original parent\'s PID',
      '-1 (invalid)',
    ],
    correctAnswer: 1,
    explanation: 'When a process becomes orphaned, the kernel re-parents it to init (PID 1), so its PPID becomes 1.',
    topic: 'orphan',
  },
  {
    id: 'q14',
    question: 'Which of the following correctly describes the exit() system call?',
    options: [
      'It immediately removes the process from the system',
      'It signals the process to stop but keeps it running',
      'It terminates the process and leaves a zombie if parent hasn\'t called wait()',
      'It only works on child processes',
    ],
    correctAnswer: 2,
    explanation: 'exit() terminates the calling process. If the parent hasn\'t called wait(), the process becomes a zombie until the parent collects its status.',
    topic: 'exit',
  },
  {
    id: 'q15',
    question: 'How many times does "Hello" print when this code runs: fork(); printf("Hello");',
    options: ['1 time', '2 times', '3 times', '4 times'],
    correctAnswer: 1,
    explanation: 'fork() creates 2 processes (parent and child). Each process then executes printf("Hello"), so "Hello" prints 2 times.',
    topic: 'fork',
  },
];

// Shuffle array using Fisher-Yates algorithm
export const shuffleQuestions = (questions: QuizQuestion[]): QuizQuestion[] => {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Get a subset of questions
export const getQuizSet = (count: number = 10): QuizQuestion[] => {
  return shuffleQuestions(quizQuestions).slice(0, count);
};
