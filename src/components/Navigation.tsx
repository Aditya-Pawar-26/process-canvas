import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Play, 
  Library, 
  BookOpen, 
  Code, 
  TreeDeciduous, 
  HelpCircle,
  Menu,
  X,
  Compass
} from 'lucide-react';
import { useState, forwardRef } from 'react';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/dashboard', label: 'Dashboard', icon: Play },
  { path: '/scenarios', label: 'Scenarios', icon: Library },
  { path: '/guided', label: 'Guided Mode', icon: Compass },
  { path: '/code-editor', label: 'Code Editor', icon: Code },
  { path: '/dsa-tree', label: 'DSA Tree', icon: TreeDeciduous },
  { path: '/theory', label: 'Theory', icon: BookOpen },
  { path: '/help', label: 'Help', icon: HelpCircle },
];

export const Navigation = forwardRef<HTMLElement>((_, ref) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav ref={ref} className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-14 items-center">
        <Link to="/" className="flex items-center space-x-2 mr-6">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <TreeDeciduous className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground hidden sm:inline-block">
            Process Tree Visualizer
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1 flex-1">
          {navItems.slice(1, 7).map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'gap-2 text-muted-foreground hover:text-foreground',
                  location.pathname === item.path && 'bg-secondary text-foreground'
                )}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center space-x-2 ml-auto">
          <Link to="/theory">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <BookOpen className="w-4 h-4" />
              <span className="hidden lg:inline">Theory</span>
            </Button>
          </Link>
          <Link to="/help">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden lg:inline">Help</span>
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden ml-auto"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card p-4 animate-fade-in">
          <div className="flex flex-col space-y-2">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start gap-3',
                    location.pathname === item.path && 'bg-secondary'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
});

Navigation.displayName = 'Navigation';
