import { SignIn, SignUp } from '@clerk/clerk-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import logo from '/logo.png';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/10 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <img src={logo} alt="" className="h-12 w-12" aria-hidden="true" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-primary">Leit</h1>
        <p className="text-muted-foreground mt-2">
          {isLogin ? 'Welcome back! Sign in to continue learning.' : 'Create an account to start your learning journey.'}
        </p>
      </div>

      {/* Clerk Auth Component */}
      <div className="w-full max-w-md">
        {isLogin ? (
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-lg border border-border bg-card",
                headerTitle: "text-foreground",
                headerSubtitle: "text-muted-foreground",
                socialButtonsBlockButton: "border-border hover:bg-accent",
                formFieldLabel: "text-foreground",
                formFieldInput: "bg-background border-border text-foreground",
                footerActionLink: "text-primary hover:text-primary/80",
                formButtonPrimary: "bg-primary hover:bg-primary/90",
              }
            }}
            routing="hash"
          />
        ) : (
          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-lg border border-border bg-card",
                headerTitle: "text-foreground",
                headerSubtitle: "text-muted-foreground",
                socialButtonsBlockButton: "border-border hover:bg-accent",
                formFieldLabel: "text-foreground",
                formFieldInput: "bg-background border-border text-foreground",
                footerActionLink: "text-primary hover:text-primary/80",
                formButtonPrimary: "bg-primary hover:bg-primary/90",
              }
            }}
            routing="hash"
          />
        )}
      </div>

      {/* Toggle between Sign In and Sign Up */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
        </p>
        <Button
          variant="link"
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm font-medium"
        >
          {isLogin ? 'Create one now' : 'Sign in instead'}
        </Button>
      </div>
    </div>
  );
};
