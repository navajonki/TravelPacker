import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Check, X, Mail, Calendar } from "lucide-react";

interface PackingListInfo {
  id: number;
  name: string;
  theme?: string;
  dateRange?: string;
}

interface Invitation {
  id: number;
  token: string;
  packingListId: number;
  packingList?: PackingListInfo;
  email: string;
  permissionLevel: string;
  expires: string;
  createdAt: string;
  accepted: boolean;
}

export default function InvitationsList() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch pending invitations for the current user
  const { 
    data: invitations = [] as Invitation[], 
    isLoading 
  } = useQuery<Invitation[]>({
    queryKey: ['/api/invitations']
  });

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async (token: string) => {
      return apiRequest('POST', `/api/invitations/${token}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/packing-lists'] });
      
      toast({
        title: "Invitation Accepted",
        description: "You now have access to the shared packing list",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to accept invitation: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Decline invitation mutation
  const declineInvitationMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/invitations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
      
      toast({
        title: "Invitation Declined",
        description: "The invitation has been declined",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to decline invitation: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleAccept = (token: string) => {
    acceptInvitationMutation.mutate(token);
  };

  const handleDecline = (id: number) => {
    declineInvitationMutation.mutate(id);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3 mb-4" />
        {[1, 2].map((i) => (
          <Card key={i} className="w-full">
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-24 mr-2" />
              <Skeleton className="h-10 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return null; // Don't show the empty state if there are no invitations
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Pending Invitations</h2>
      
      {invitations.map((invitation: Invitation) => {
        // Get packing list information safely
        const packingListName = invitation.packingList?.name || `Packing List #${invitation.packingListId}`;
        const packingListTheme = invitation.packingList?.theme || invitation.packingList?.dateRange;
        
        return (
          <Card key={invitation.id} className="w-full hover:shadow-sm transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{packingListName}</CardTitle>
                  <CardDescription>
                    {packingListTheme || 'No theme/dates'}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="ml-2">
                  {invitation.permissionLevel === 'editor' ? 'Can Edit' : 'View Only'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="text-sm text-gray-500 space-y-2">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Invitation expires: {formatDate(invitation.expires)}</span>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDecline(invitation.id)}
                disabled={declineInvitationMutation.isPending}
              >
                <X className="h-4 w-4 mr-1" />
                Decline
              </Button>
              
              <Button 
                variant="default" 
                size="sm"
                onClick={() => handleAccept(invitation.token)}
                disabled={acceptInvitationMutation.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                Accept
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}