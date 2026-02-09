import React from 'react';

interface Props {
  code: string;
  currentLine: number;
}

// Simple C syntax highlighter for process-related code
const highlightLine = (line: string): React.ReactNode[] => {
  const tokens: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  const patterns: [RegExp, string][] = [
    // Comments
    [/^(\/\/.*)/, 'text-muted-foreground italic'],
    // Preprocessor
    [/^(#include\s+<[^>]+>)/, 'text-purple-400'],
    [/^(#include\s+"[^"]+")/, 'text-purple-400'],
    // String literals
    [/^("[^"]*")/, 'text-green-400'],
    // Keywords
    [/^(int|void|pid_t|char|return|if|else|for|while)\b/, 'text-blue-400 font-semibold'],
    // OS functions
    [/^(fork|wait|waitpid|exit|sleep|printf|getpid|getppid|main)\b/, 'text-yellow-400'],
    // Numbers
    [/^(\d+)/, 'text-orange-400'],
    // Parens/braces
    [/^([{}()])/, 'text-muted-foreground/70'],
    // Semicolons
    [/^(;)/, 'text-muted-foreground/50'],
    // Operators
    [/^(==|!=|>=|<=|>|<|=|\+\+|--)/, 'text-cyan-400'],
    // NULL
    [/^(NULL)\b/, 'text-orange-400 font-semibold'],
  ];

  while (remaining.length > 0) {
    let matched = false;
    for (const [pattern, className] of patterns) {
      const match = remaining.match(pattern);
      if (match) {
        tokens.push(
          <span key={key++} className={className}>{match[1]}</span>
        );
        remaining = remaining.slice(match[1].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Consume one character as plain text
      const spaceMatch = remaining.match(/^(\s+)/);
      if (spaceMatch) {
        tokens.push(<span key={key++}>{spaceMatch[1]}</span>);
        remaining = remaining.slice(spaceMatch[1].length);
      } else {
        const wordMatch = remaining.match(/^(\w+)/);
        if (wordMatch) {
          tokens.push(<span key={key++} className="text-foreground">{wordMatch[1]}</span>);
          remaining = remaining.slice(wordMatch[1].length);
        } else {
          tokens.push(<span key={key++} className="text-foreground">{remaining[0]}</span>);
          remaining = remaining.slice(1);
        }
      }
    }
  }

  return tokens;
};

export const SyntaxHighlightedCode: React.FC<Props> = ({ code, currentLine }) => {
  const lines = code.split('\n');

  return (
    <pre className="p-4 font-mono text-sm leading-6 pointer-events-none select-none whitespace-pre overflow-x-auto">
      {lines.map((line, i) => (
        <div
          key={i}
          className={`${currentLine === i + 1 ? 'bg-primary/10 -mx-4 px-4 rounded' : ''}`}
        >
          {highlightLine(line)}
          {'\n'}
        </div>
      ))}
    </pre>
  );
};
