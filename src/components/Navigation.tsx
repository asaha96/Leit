import { Button } from '@/components/ui/button';
import { UserButton } from '@clerk/clerk-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BookOpen, BarChart3, GraduationCap } from 'lucide-react';
import logo from '/logo.png';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  const navItems = [
    { id: 'study', label: 'Study', icon: BookOpen },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'practice', label: 'Practice', icon: GraduationCap },
  ];

  return (
    <nav
      className="bg-background border-b border-border sticky top-0 z-50"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo and brand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <img src={logo} alt="" className="h-8 w-8 rounded-sm" aria-hidden="true" />
            <span className="text-xl md:text-2xl font-bold text-primary">Leit</span>
          </div>

          {/* Navigation tabs */}
          <div className="flex items-center gap-1 md:gap-2" role="tablist" aria-label="Main sections">
            {navItems.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={activeTab === id ? 'default' : 'ghost'}
                onClick={() => onTabChange(id)}
                className="tap-target px-3 md:px-4"
                role="tab"
                aria-selected={activeTab === id}
                aria-controls={`${id}-panel`}
              >
                <Icon className="h-4 w-4 md:mr-2" aria-hidden="true" />
                <span className="hidden md:inline">{label}</span>
              </Button>
            ))}
          </div>

          {/* User actions */}
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <ThemeToggle />
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9",
                  userButtonPopoverCard: "shadow-lg border border-border",
                  userButtonPopoverActionButton: "hover:bg-accent",
                }
              }}
            />
          </div>
        </div>
      </div>
    </nav>
  );
};
