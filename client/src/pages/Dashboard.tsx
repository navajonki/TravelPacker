import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";

import MobileNav from "@/components/MobileNav";
import CreateListModal from "@/components/modals/CreateListModal";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Luggage } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [createListOpen, setCreateListOpen] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: packingLists = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/packing-lists?userId=1'],
  });
  
  const createPackingListMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/packing-lists', {
        ...data,
        userId: 1 // Using the default user ID
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/packing-lists?userId=1'] });
      toast({
        title: "Success",
        description: "Packing list created successfully",
      });
      setLocation(`/list/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create packing list",
        variant: "destructive",
      });
    }
  });
  
  const handleCreateList = async (data: { name: string, theme: string, dateRange?: string }) => {
    await createPackingListMutation.mutate(data);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header onCreateNewList={() => setCreateListOpen(true)} />
      
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-background p-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-semibold mb-6">Your Packing Lists</h1>
            
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
                {packingLists.map((list: any) => (
                  <Card 
                    key={list.id}
                    className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setLocation(`/list/${list.id}`)}
                  >
                    <CardContent className="p-6">
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
      
      <MobileNav />
      
      <CreateListModal
        open={createListOpen}
        onClose={() => setCreateListOpen(false)}
        onCreateList={handleCreateList}
      />
    </div>
  );
}
