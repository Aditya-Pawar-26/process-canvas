import { useState, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ArrowRight, 
  Trophy,
  Brain,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuizQuestion, getQuizSet } from '@/data/quizQuestions';

type QuizState = 'intro' | 'question' | 'result';

const Quiz = () => {
  const [quizState, setQuizState] = useState<QuizState>('intro');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; correct: boolean }[]>([]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const startQuiz = useCallback(() => {
    const newQuestions = getQuizSet(10);
    setQuestions(newQuestions);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setHasSubmitted(false);
    setScore(0);
    setAnswers([]);
    setQuizState('question');
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedAnswer === null) return;
    
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    setAnswers(prev => [...prev, { questionId: currentQuestion.id, correct: isCorrect }]);
    setHasSubmitted(true);
  }, [selectedAnswer, currentQuestion]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setHasSubmitted(false);
    } else {
      setQuizState('result');
    }
  }, [currentIndex, questions.length]);

  const getScoreMessage = () => {
    const percentage = (score / questions.length) * 100;
    if (percentage >= 90) return { message: 'Outstanding!', emoji: '🏆' };
    if (percentage >= 70) return { message: 'Great Job!', emoji: '🎉' };
    if (percentage >= 50) return { message: 'Good Effort!', emoji: '👍' };
    return { message: 'Keep Learning!', emoji: '📚' };
  };

  const getTopicBadgeColor = (topic: QuizQuestion['topic']) => {
    const colors: Record<string, string> = {
      zombie: 'bg-red-500/20 text-red-400 border-red-500/30',
      orphan: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      wait: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      exit: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      fork: 'bg-green-500/20 text-green-400 border-green-500/30',
      init: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      lifecycle: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    };
    return colors[topic] || 'bg-muted text-muted-foreground';
  };

  // Intro Screen
  if (quizState === 'intro') {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-8 max-w-2xl mx-auto">
          <Card className="border-border">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">OS Process Lifecycle Quiz</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-muted-foreground">
                Test your understanding of UNIX process management concepts including 
                fork, wait, exit, zombies, and orphans.
              </p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="font-semibold text-foreground">10 Questions</div>
                  <div className="text-muted-foreground">Randomized each time</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="font-semibold text-foreground">Instant Feedback</div>
                  <div className="text-muted-foreground">With explanations</div>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="outline" className={getTopicBadgeColor('fork')}>fork()</Badge>
                <Badge variant="outline" className={getTopicBadgeColor('wait')}>wait()</Badge>
                <Badge variant="outline" className={getTopicBadgeColor('exit')}>exit()</Badge>
                <Badge variant="outline" className={getTopicBadgeColor('zombie')}>Zombie</Badge>
                <Badge variant="outline" className={getTopicBadgeColor('orphan')}>Orphan</Badge>
                <Badge variant="outline" className={getTopicBadgeColor('init')}>init</Badge>
              </div>

              <Button size="lg" onClick={startQuiz} className="gap-2">
                Start Quiz
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Result Screen
  if (quizState === 'result') {
    const { message, emoji } = getScoreMessage();
    const percentage = (score / questions.length) * 100;

    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-8 max-w-2xl mx-auto">
          <Card className="border-border">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <Trophy className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="text-6xl">{emoji}</div>
              
              <div>
                <div className="text-4xl font-bold text-foreground">
                  {score} / {questions.length}
                </div>
                <div className="text-muted-foreground mt-1">{message}</div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Score</span>
                  <span>{percentage.toFixed(0)}%</span>
                </div>
                <Progress value={percentage} className="h-3" />
              </div>

              <div className="grid grid-cols-5 gap-2">
                {answers.map((answer, idx) => (
                  <div
                    key={answer.questionId}
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium',
                      answer.correct 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    )}
                  >
                    {idx + 1}
                  </div>
                ))}
              </div>

              <div className="flex gap-4 justify-center pt-4">
                <Button variant="outline" onClick={() => setQuizState('intro')}>
                  Back to Start
                </Button>
                <Button onClick={startQuiz} className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Question Screen
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-8 max-w-2xl mx-auto">
        {/* Progress Header */}
        <div className="mb-6 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <Badge variant="outline" className={getTopicBadgeColor(currentQuestion.topic)}>
              {currentQuestion.topic}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="border-border">
          <CardContent className="pt-6 space-y-6">
            {/* Scenario (if present) */}
            {currentQuestion.scenario && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Scenario
                </div>
                <div className="text-sm text-foreground font-mono">
                  {currentQuestion.scenario}
                </div>
              </div>
            )}

            {/* Question */}
            <div className="text-lg font-medium text-foreground">
              {currentQuestion.question}
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrect = idx === currentQuestion.correctAnswer;
                const showCorrect = hasSubmitted && isCorrect;
                const showIncorrect = hasSubmitted && isSelected && !isCorrect;

                return (
                  <button
                    key={idx}
                    onClick={() => !hasSubmitted && setSelectedAnswer(idx)}
                    disabled={hasSubmitted}
                    className={cn(
                      'w-full p-4 rounded-lg border text-left transition-all',
                      'flex items-center gap-3',
                      !hasSubmitted && 'hover:bg-muted/50 hover:border-primary/50',
                      !hasSubmitted && isSelected && 'border-primary bg-primary/10',
                      showCorrect && 'border-green-500 bg-green-500/10',
                      showIncorrect && 'border-red-500 bg-red-500/10',
                      hasSubmitted && !showCorrect && !showIncorrect && 'opacity-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0',
                        'border-2',
                        !hasSubmitted && isSelected 
                          ? 'border-primary bg-primary text-primary-foreground' 
                          : 'border-muted-foreground/30 text-muted-foreground',
                        showCorrect && 'border-green-500 bg-green-500 text-white',
                        showIncorrect && 'border-red-500 bg-red-500 text-white'
                      )}
                    >
                      {showCorrect ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : showIncorrect ? (
                        <XCircle className="w-5 h-5" />
                      ) : (
                        String.fromCharCode(65 + idx)
                      )}
                    </div>
                    <span className={cn(
                      'text-sm',
                      (showCorrect || (hasSubmitted && isCorrect)) && 'text-green-400 font-medium',
                      showIncorrect && 'text-red-400'
                    )}>
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Explanation (after submit) */}
            {hasSubmitted && (
              <div className={cn(
                'p-4 rounded-lg flex gap-3',
                selectedAnswer === currentQuestion.correctAnswer
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-blue-500/10 border border-blue-500/30'
              )}>
                <Lightbulb className={cn(
                  'w-5 h-5 shrink-0 mt-0.5',
                  selectedAnswer === currentQuestion.correctAnswer
                    ? 'text-green-400'
                    : 'text-blue-400'
                )} />
                <div className="text-sm text-foreground">
                  {currentQuestion.explanation}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Score: <span className="font-medium text-foreground">{score}</span> / {currentIndex + (hasSubmitted ? 1 : 0)}
              </div>
              
              {!hasSubmitted ? (
                <Button 
                  onClick={handleSubmit} 
                  disabled={selectedAnswer === null}
                >
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={handleNext} className="gap-2">
                  {currentIndex < questions.length - 1 ? (
                    <>
                      Next Question
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      See Results
                      <Trophy className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Quiz;
