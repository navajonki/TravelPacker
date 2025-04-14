import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { 
  Users, 
  UserPlus, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User,
  UserX
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CollaborationViewProps {
  packingListId: number;
}

interface Collaborator {
  id: number;
  packingListId: number;
  userId: number;
  role: string;
  username: string;
  createdAt: string;
}

interface Invitation {
  id: number;
  packingListId: number;
  email: string;
  token: string;
  role: string;
  createdAt: string;
  expiresAt: string;
}

export default function CollaborationView({ packingListId }: CollaborationViewProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [removeCollaboratorId, setRemoveCollaboratorId] = useState<number | null>(null);
  const [cancelInvitationId, setCancelInvitationId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch collaborators for this packing list
  const { data: collaborators = [], isLoading: isLoadingCollaborators } = useQuery<Collaborator[]>({
    queryKey: [`/api/packing-lists/${packingListId}/collaborators`],
  });

  // Fetch pending invitations for this packing list
  const { data: invitations = [], isLoading: isLoadingInvitations } = useQuery<Invitation[]>({
    queryKey: [`/api/packing-lists/${packingListId}/invitations`],
  });

  // Add collaborator mutation
  const inviteCollaboratorMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest('POST', `/api/packing-lists/${packingListId}/invitations`, {
        email,
        role: 'editor'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/invitations`] });
      toast({
        title: "Invitation Sent",
        description: "Collaboration invitation has been sent successfully",
      });
      setInviteEmail("");
      setInviteDialogOpen(false);
    },
    onError: async (error: any) => {
      let errorMessage = "Failed to send invitation";
      
      // Try to extract more detailed error information
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error.response) {
        try {
          // Try to get response text
          const responseText = await error.response.text();
          
          // Try to parse as JSON
          try {
            const errorData = JSON.parse(responseText);
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (e) {
            // If not JSON, use the response text
            if (responseText) {
              errorMessage = responseText;
            }
          }
        } catch (e) {
          // If we can't get response text, use status text
          errorMessage = `${error.response.status}: ${error.response.statusText}`;
        }
      }
      
      console.error("Invitation error details:", error);
      
      toast({
        title: "Error Sending Invitation",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // Remove collaborator mutation
  const removeCollaboratorMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest('DELETE', `/api/packing-lists/${packingListId}/collaborators/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/collaborators`] });
      toast({
        title: "Collaborator Removed",
        description: "Collaborator has been removed successfully",
      });
      setRemoveCollaboratorId(null);
    },
    onError: async (error: any) => {
      let errorMessage = "Failed to remove collaborator";
      
      // Try to extract more detailed error information
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error.response) {
        try {
          // Try to get response text
          const responseText = await error.response.text();
          
          // Try to parse as JSON
          try {
            const errorData = JSON.parse(responseText);
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (e) {
            // If not JSON, use the response text
            if (responseText) {
              errorMessage = responseText;
            }
          }
        } catch (e) {
          // If we can't get response text, use status text
          errorMessage = `${error.response.status}: ${error.response.statusText}`;
        }
      }
      
      console.error("Remove collaborator error details:", error);
      
      toast({
        title: "Error Removing Collaborator",
        description: errorMessage,
        variant: "destructive",
      });
      setRemoveCollaboratorId(null);
    }
  });

  // Cancel invitation mutation
  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      return await apiRequest('DELETE', `/api/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/invitations`] });
      toast({
        title: "Invitation Cancelled",
        description: "Invitation has been cancelled successfully",
      });
      setCancelInvitationId(null);
    },
    onError: async (error: any) => {
      let errorMessage = "Failed to cancel invitation";
      
      // Try to extract more detailed error information
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error.response) {
        try {
          // Try to get response text
          const responseText = await error.response.text();
          
          // Try to parse as JSON
          try {
            const errorData = JSON.parse(responseText);
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (e) {
            // If not JSON, use the response text
            if (responseText) {
              errorMessage = responseText;
            }
          }
        } catch (e) {
          // If we can't get response text, use status text
          errorMessage = `${error.response.status}: ${error.response.statusText}`;
        }
      }
      
      console.error("Cancel invitation error details:", error);
      
      toast({
        title: "Error Cancelling Invitation",
        description: errorMessage,
        variant: "destructive",
      });
      setCancelInvitationId(null);
    }
  });

  const handleSendInvitation = () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    inviteCollaboratorMutation.mutate(inviteEmail);
  };

  const handleRemoveCollaborator = (userId: number) => {
    setRemoveCollaboratorId(userId);
  };

  const confirmRemoveCollaborator = () => {
    if (removeCollaboratorId !== null) {
      removeCollaboratorMutation.mutate(removeCollaboratorId);
    }
  };

  const handleCancelInvitation = (invitationId: number) => {
    setCancelInvitationId(invitationId);
  };

  const confirmCancelInvitation = () => {
    if (cancelInvitationId !== null) {
      cancelInvitationMutation.mutate(cancelInvitationId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  // Loading state
  if (isLoadingCollaborators || isLoadingInvitations) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Users className="h-6 w-6 mr-2 text-primary" />
          <h2 className="text-xl font-semibold">Collaboration</h2>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Collaborator
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a Collaborator</DialogTitle>
              <DialogDescription>
                Enter the email address of the person you'd like to invite to collaborate on this packing list.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  placeholder="collaborator@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendInvitation} disabled={inviteCollaboratorMutation.isPending}>
                {inviteCollaboratorMutation.isPending ? (
                  <>Sending...</>
                ) : (
                  <>Send Invitation</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Current Collaborators Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <User className="h-5 w-5 mr-2 text-primary" />
            Current Collaborators
          </CardTitle>
          <CardDescription>
            People who have access to this packing list
          </CardDescription>
        </CardHeader>
        <CardContent>
          {collaborators.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No collaborators yet. Invite someone to collaborate on this list.
            </div>
          ) : (
            <div className="space-y-3">
              {collaborators.map((collaborator) => (
                <div key={collaborator.id} className="flex items-center justify-between p-3 rounded-md border">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback>
                        {collaborator.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{collaborator.username}</p>
                      <p className="text-sm text-gray-500">{collaborator.role}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemoveCollaborator(collaborator.userId)}
                  >
                    <UserX className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Pending Invitations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Mail className="h-5 w-5 mr-2 text-primary" />
            Pending Invitations
          </CardTitle>
          <CardDescription>
            Invitations that have been sent but not yet accepted
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No pending invitations
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div 
                  key={invitation.id} 
                  className={`flex items-center justify-between p-3 rounded-md border ${isExpired(invitation.expiresAt) ? 'bg-gray-50' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${isExpired(invitation.expiresAt) ? 'bg-gray-200' : 'bg-blue-100'}`}>
                      {isExpired(invitation.expiresAt) ? (
                        <XCircle className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="mr-2">Expires: {formatDate(invitation.expiresAt)}</span>
                        {isExpired(invitation.expiresAt) && (
                          <span className="text-red-500 text-xs">Expired</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleCancelInvitation(invitation.id)}
                    disabled={isExpired(invitation.expiresAt)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Collaborator Dialog */}
      <AlertDialog open={removeCollaboratorId !== null} onOpenChange={(open) => !open && setRemoveCollaboratorId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Collaborator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this collaborator? They will no longer have access to this packing list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemoveCollaborator}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invitation Dialog */}
      <AlertDialog open={cancelInvitationId !== null} onOpenChange={(open) => !open && setCancelInvitationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this invitation? The invitee will no longer be able to join this packing list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancelInvitation}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              Cancel Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}