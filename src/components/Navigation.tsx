import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  const { signOut, dbUser } = useAuth();

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <h1 className="text-2xl font-bold text-primary mr-6">Leit</h1>
            
            <Button 
              variant={activeTab === 'study' ? 'default' : 'ghost'}
              onClick={() => onTabChange('study')}
              className="px-4 py-2"
            >
              Study
            </Button>
            
            <Button 
              variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
              onClick={() => onTabChange('dashboard')}
              className="px-4 py-2"
            >
              Dashboard
            </Button>
            
            <Button 
              variant={activeTab === 'practice' ? 'default' : 'ghost'}
              onClick={() => onTabChange('practice')}
              className="px-4 py-2"
            >
              Practice
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {dbUser?.display_name || 'User'}
            </span>
            <Button 
              variant="outline" 
              onClick={signOut}
              className="px-4 py-2"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};