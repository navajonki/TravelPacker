import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import PackingList from "@/pages/PackingList";
import AuthPage from "@/pages/AuthPage";
import InvitationPage from "@/pages/InvitationPage";
import UnassignedItemsTest from "@/pages/UnassignedItemsTest";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SyncStatusProvider } from "@/hooks/use-sync-status";
import SyncStatusIndicator from "@/components/SyncStatusIndicator";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/list/:id" component={PackingList} />
      <ProtectedRoute path="/list/:id/unassigned" component={UnassignedItemsTest} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/invitation/:token" component={InvitationPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SyncStatusProvider>
          <Router />
          <SyncStatusIndicator />
          <Toaster />
        </SyncStatusProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
