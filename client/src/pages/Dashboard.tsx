import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import CreateListModal from "@/components/modals/CreateListModal";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Luggage, Trash2, Plus, Wrench, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ListData {
  id: number;
  name: string;
  theme: string;
  dateRange?: string;
  userId: number;
  createdAt: string;
  itemCount: number;
  progress: number;
}

export default function Dashboard() {
  const [createListOpen, setCreateListOpen] = useState(false);
  const [deleteListId, setDeleteListId] = useState<number | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [packingListIdForDiagnostic, setPackingListIdForDiagnostic] = useState<string>("");
  const [tokenForDiagnostic, setTokenForDiagnostic] = useState<string>("");
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { data: packingLists = [], isLoading } = useQuery<ListData[]>({
    queryKey: ['/api/packing-lists'],
  });
  
  const createPackingListMutation = useMutation({
    mutationFn: async (data: { name: string; theme?: string; dateRange?: string }) => {
      return apiRequest('POST', '/api/packing-lists', data);
    },
    onSuccess: (data: ListData) => {
      queryClient.invalidateQueries({ queryKey: ['/api/packing-lists'] });
      toast({
        title: "Success",
        description: "Packing list created successfully",
      });
      setLocation(`/list/${data.id}`);
    },
    onError: (error: unknown) => {
      console.error("Error creating packing list:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Error Creating List",
        description: `Failed to create packing list: ${errorMessage}`,
        variant: "destructive",
      });
    }
  });
  
  const deletePackingListMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/packing-lists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packing-lists'] });
      toast({
        title: "Success",
        description: "Packing list deleted successfully",
      });
      setDeleteListId(null);
    },
    onError: (error: unknown) => {
      console.error("Error deleting packing list:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Error Deleting List",
        description: `Failed to delete packing list: ${errorMessage}`,
        variant: "destructive",
      });
      setDeleteListId(null);
    }
  });

  const handleCreateList = async (data: { name: string; theme?: string; dateRange?: string }) => {
    createPackingListMutation.mutate(data);
  };
  
  const handleDeleteList = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Prevent card click from navigating
    setDeleteListId(id);
  };
  
  const confirmDelete = () => {
    if (deleteListId) {
      deletePackingListMutation.mutate(deleteListId);
    }
  };
  
  // Manual invitation acceptance for debugging
  const manualAcceptMutation = useMutation({
    mutationFn: async ({ packingListId, token }: { packingListId: number, token?: string }) => {
      return apiRequest('POST', `/api/invitations/manual-accept`, { packingListId, token });
    },
    onSuccess: (data) => {
      setDiagnosticResult(data);
      queryClient.invalidateQueries({ queryKey: ['/api/packing-lists'] });
      toast({
        title: "Collaboration Diagnostic",
        description: "Manual invitation acceptance completed",
      });
    },
    onError: (error: any) => {
      setDiagnosticResult({ error: error.message });
      toast({
        title: "Error",
        description: `Failed to manually accept invitation: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const handleManualAccept = () => {
    if (!packingListIdForDiagnostic) {
      toast({
        title: "Error",
        description: "Please enter a packing list ID",
        variant: "destructive",
      });
      return;
    }
    
    manualAcceptMutation.mutate({ 
      packingListId: parseInt(packingListIdForDiagnostic),
      token: tokenForDiagnostic || undefined
    });
  };
  
  // Comprehensive collaboration diagnostic mutation
  const collaborationDiagnosticMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/collaboration/diagnostic');
    },
    onSuccess: (data) => {
      setDiagnosticResult(data);
      toast({
        title: "Collaboration Diagnostic",
        description: "Diagnostic completed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to run diagnostic: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const handleRunDiagnostic = () => {
    collaborationDiagnosticMutation.mutate();
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-background p-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-semibold">Your Packing Lists</h1>
              <div className="flex gap-2">
                {/* Only show diagnostic button if user is logged in */}
                {user && (
                  <Button 
                    onClick={() => setShowDiagnostic(!showDiagnostic)}
                    variant="outline"
                    className="flex items-center"
                  >
                    <Wrench className="h-4 w-4 mr-1" />
                    {showDiagnostic ? "Hide Diagnostic" : "Collaboration Diagnostic"}
                  </Button>
                )}
                <Button 
                  onClick={() => setCreateListOpen(true)}
                  className="flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New List
                </Button>
              </div>
            </div>
            
            {/* Collaboration Diagnostic Tool */}
            {showDiagnostic && (
              <Card className="mb-6 border-dashed border-yellow-400">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-yellow-500" />
                    Collaboration Diagnostic Tool
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Current user: <span className="font-semibold">{user?.username}</span> (ID: {user?.id})
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        This tool helps diagnose collaboration permission issues by manually adding you as a collaborator to a packing list.
                      </p>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-1 block">Packing List ID</label>
                        <Input 
                          value={packingListIdForDiagnostic} 
                          onChange={(e) => setPackingListIdForDiagnostic(e.target.value)}
                          placeholder="Enter the packing list ID"
                          type="number"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-1 block">Invitation Token (optional)</label>
                        <Input 
                          value={tokenForDiagnostic} 
                          onChange={(e) => setTokenForDiagnostic(e.target.value)}
                          placeholder="Enter the invitation token"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={handleRunDiagnostic}
                        variant="outline"
                        className="w-1/2 mt-2"
                      >
                        Comprehensive Diagnostic
                      </Button>
                      
                      <Button
                        onClick={handleManualAccept}
                        variant="secondary"
                        className="w-1/2 mt-2"
                      >
                        Manual Add Collaborator
                      </Button>
                    </div>
                    
                    {diagnosticResult && (
                      <div className="mt-4 p-4 bg-muted rounded-md overflow-auto max-h-80">
                        <h3 className="text-sm font-semibold mb-2">Diagnostic Result:</h3>
                        <pre className="text-xs overflow-auto whitespace-pre-wrap">
                          {JSON.stringify(diagnosticResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-3/4 mb-4" />
                      <Skeleton className="h-4 w-1/2 mb-6" />
                      <Skeleton className="h-2 w-full mb-2" />
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-10" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : packingLists?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packingLists.map((list) => (
                  <Card 
                    key={list.id}
                    className="overflow-hidden hover:shadow-md transition-shadow flex flex-col"
                  >
                    <CardContent 
                      className="p-6 cursor-pointer flex-grow"
                      onClick={() => setLocation(`/list/${list.id}`)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Luggage className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold">{list.name}</h2>
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-4">
                        {list.dateRange || list.theme}
                      </p>
                      
                      <Progress value={list.progress} className="h-2 mb-2" />
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{list.itemCount} items</span>
                        <span className="font-medium">{list.progress}% packed</span>
                      </div>
                    </CardContent>
                    <CardFooter className="px-6 py-3 border-t flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 transition"
                        onClick={(e) => handleDeleteList(e, list.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-blue-50 p-3 rounded-full mb-4">
                  <Luggage className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No packing lists yet</h2>
                <p className="text-gray-500 mb-6 max-w-md">
                  Create your first packing list to start organizing your travel items efficiently.
                </p>
                <Button onClick={() => setCreateListOpen(true)}>
                  Create New List
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <CreateListModal
        open={createListOpen}
        onClose={() => setCreateListOpen(false)}
        onCreateList={handleCreateList}
      />
      
      <AlertDialog open={deleteListId !== null} onOpenChange={(open) => !open && setDeleteListId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Packing List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this packing list? This action cannot be undone
              and all items, bags, categories, and travelers associated with this list will
              also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
