import { Navigation } from '@/components/Navigation';
import { Keyboard, Info, Code, ExternalLink } from 'lucide-react';

const Help = () => {
  const shortcuts = [
    { key: 'F', action: 'Fork process from selected node' },
    { key: 'W', action: 'Wait for children of selected process' },
    { key: 'X', action: 'Exit/Kill selected process' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Help & About</h1>
          <p className="text-muted-foreground">
            How to use the Process Forking Tree Visualizer
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* How to Use */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              How to Use
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground text-sm">
              <li>Start at the Dashboard to create processes</li>
              <li>Click "Fork" to create the root process first</li>
              <li>Select a node and use controls or right-click menu</li>
              <li>Watch the tree grow with each fork() call</li>
              <li>Explore Scenarios for guided examples</li>
              <li>Use DSA Tree page for traversal algorithms</li>
            </ol>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-primary" />
              Keyboard Shortcuts
            </h2>
            <div className="space-y-2">
              {shortcuts.map(({ key, action }) => (
                <div key={key} className="flex items-center gap-3">
                  <kbd className="px-2 py-1 bg-secondary rounded text-xs font-mono font-bold">
                    {key}
                  </kbd>
                  <span className="text-sm text-muted-foreground">{action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Technologies */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-primary" />
              Technologies Used
            </h2>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>React + TypeScript</li>
              <li>Tailwind CSS</li>
              <li>Shadcn/ui Components</li>
              <li>React Router</li>
              <li>Lucide Icons</li>
            </ul>
          </div>

          {/* About */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-primary" />
              About This Project
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              An educational tool for learning Operating Systems process concepts 
              through interactive tree data structure visualization.
            </p>
            <p className="text-sm text-muted-foreground">
              Designed for engineering students studying OS and DSA fundamentals.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Help;
