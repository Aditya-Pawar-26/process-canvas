import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { Play, Library, BookOpen, GitFork, Clock, XCircle, TreeDeciduous } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-12">
        {/* Hero Section */}
        <section className="text-center py-16 relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-full bg-primary/20 animate-float"
                style={{
                  left: `${15 + i * 15}%`,
                  top: `${20 + (i % 3) * 25}%`,
                  animationDelay: `${i * 0.5}s`,
                }}
              />
            ))}
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <TreeDeciduous className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary">OS + DSA Interactive Learning</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
              Process Forking Tree
              <span className="text-primary"> Visualizer</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Visualize Operating System process concepts using Tree Data Structures. 
              Learn fork(), wait(), and exit() through interactive demonstrations.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/dashboard">
                <Button size="lg" className="gap-2 glow-primary">
                  <Play className="w-5 h-5" />
                  Start Visualization
                </Button>
              </Link>
              <Link to="/scenarios">
                <Button size="lg" variant="outline" className="gap-2">
                  <Library className="w-5 h-5" />
                  Explore Scenarios
                </Button>
              </Link>
              <Link to="/theory">
                <Button size="lg" variant="ghost" className="gap-2">
                  <BookOpen className="w-5 h-5" />
                  Learn Theory
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Concept Bridge */}
        <section className="py-16">
          <h2 className="text-2xl font-bold text-center mb-8">Concept Mapping</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { os: 'fork()', dsa: 'Node Creation', icon: GitFork, desc: 'Creates child process = Adds tree node' },
              { os: 'wait()', dsa: 'Postorder Traversal', icon: Clock, desc: 'Parent waits for children = Process leaves first' },
              { os: 'exit()', dsa: 'Node Deletion', icon: XCircle, desc: 'Terminates process = Removes node' },
            ].map((item, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary transition-colors">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="font-mono text-lg text-primary mb-1">{item.os}</div>
                <div className="text-sm text-muted-foreground mb-2">↓</div>
                <div className="font-semibold text-foreground mb-2">{item.dsa}</div>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Mini Preview */}
        <section className="py-16">
          <div className="bg-card border border-border rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-center text-lg font-semibold mb-6">Process Tree Preview</h3>
            <div className="flex flex-col items-center">
              <div className="w-20 h-12 rounded-lg bg-process-running/20 border-2 border-process-running flex items-center justify-center mb-2">
                <span className="font-mono text-sm">PID 1</span>
              </div>
              <div className="w-px h-6 bg-primary/50" />
              <div className="flex gap-8">
                {[2, 3].map(pid => (
                  <div key={pid} className="flex flex-col items-center">
                    <div className="w-16 h-10 rounded-lg bg-process-running/20 border-2 border-process-running flex items-center justify-center">
                      <span className="font-mono text-xs">PID {pid}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Landing;
