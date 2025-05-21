import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Check, X, Mail, Calendar, User } from "lucide-react";
import { usePendingInvitations } from "../hooks";

export default function InvitationsList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Use the custom pending invitations hook
  const { 
    pendingInvitations: invitations, 
    isLoading, 
    acceptInvitation, 
    declineInvitation 
  } = usePendingInvitations();

  const handleAccept = async (token: string) => {
    try {
      const result = await acceptInvitation(token);
      toast({
        title: "Invitation Accepted",
        description: "You now have access to the shared packing list",
      });
      
      // Redirect to the packing list if possible
      if (result?.packingListId) {
        setLocation(`/list/${result.packingListId}`);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
    }
  };

  const handleDecline = async (id: number) => {
    try {
      await declineInvitation(id);
      toast({
        title: "Invitation Declined",
        description: "The invitation has been declined",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to decline invitation",
        variant: "destructive",
      });
    }
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
      
      {invitations.map((invitation) => {
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
                  {invitation.permissionLevel === 'editor' ? 'Can Edit' : invitation.permissionLevel === 'admin' ? 'Admin' : 'View Only'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="text-sm text-gray-500 space-y-2">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  <span>Invited by: {invitation.inviterName || `User #${invitation.invitedByUserId}`}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Expires: {formatDate(invitation.expires)}</span>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDecline(invitation.id)}
              >
                <X className="h-4 w-4 mr-1" />
                Decline
              </Button>
              
              <Button 
                variant="default" 
                size="sm"
                onClick={() => handleAccept(invitation.token)}
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