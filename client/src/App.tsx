import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import PackingList from "@/pages/PackingList";
import AuthPage from "@/pages/AuthPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import InvitationPage from "@/pages/InvitationPage";
import UnassignedItemsTest from "@/pages/UnassignedItemsTest";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SyncStatusProvider } from "@/hooks/use-sync-status";
import SyncStatusIndicator from "@/components/SyncStatusIndicator";
import { usePackingList } from "@/contexts/PackingListContext";
import { NetworkProvider } from "@/contexts/NetworkContext";
import { useEffect } from "react";
import { PackingListProvider } from "@/contexts/PackingListContext";

function Router() {
  // Get the active list ID from the URL and update the context
  const { setActiveListId } = usePackingList();
  const [location] = useLocation();
  
  useEffect(() => {
    // Extract list ID from URL if we're on a list page
    const match = location.match(/\/list\/([0-9]+)/);
    if (match && match[1]) {
      const listId = parseInt(match[1], 10);
      setActiveListId(listId);
    } else if (!location.startsWith('/list/')) {
      // Reset active list ID when not on a list page
      setActiveListId(null);
    }
  }, [location, setActiveListId]);
  
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/list/:id" component={PackingList} />
      <ProtectedRoute path="/list/:id/unassigned" component={UnassignedItemsTest} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/invitation/:token" component={InvitationPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <NetworkProvider>
        <PackingListProvider>
          <SyncStatusProvider>
            <Router />
            <SyncStatusIndicator />
            <Toaster />
          </SyncStatusProvider>
        </PackingListProvider>
      </NetworkProvider>
    </AuthProvider>
  );
}

export default App;
