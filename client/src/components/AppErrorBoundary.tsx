import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logComponentError } from '@/services/errorHandling';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * Main error boundary for the application with error reporting
 */
const AppErrorBoundary: React.FC<AppErrorBoundaryProps> = ({ children }) => {
  const { toast } = useToast();

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log the error through our error service
    logComponentError(error, errorInfo.componentStack, 'AppRoot');

    // Show a toast notification
    toast({
      title: 'Application Error',
      description: 'An unexpected error occurred. The development team has been notified.',
      variant: 'destructive',
    });
  };

  const handleReset = () => {
    // Hard reload the application
    window.location.reload();
  };

  // Custom fallback UI for critical app errors
  const appFallback = (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="bg-red-50 border-b border-red-100">
          <CardTitle className="text-red-700 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Application Error
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-gray-700 mb-4">
            We're sorry, but something went wrong. Our team has been notified and is working to fix the issue.
          </p>
          <p className="text-gray-600 mb-4">
            You can try refreshing the page to resolve this problem.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center bg-gray-50 p-4 border-t border-gray-100">
          <Button onClick={handleReset} className="flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload Application
          </Button>
        </CardFooter>
      </Card>
    </div>
  );

  return (
    <ErrorBoundary 
      onError={handleError} 
      fallback={appFallback}
      componentName="AppRoot"
    >
      {children}
    </ErrorBoundary>
  );
};

export default AppErrorBoundary;