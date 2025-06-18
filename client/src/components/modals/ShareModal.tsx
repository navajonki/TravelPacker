import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  SideDialog, 
  SideDialogContent, 
  SideDialogHeader, 
  SideDialogTitle,
  SideDialogDescription 
} from "@/components/ui/side-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
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
  UserPlus, 
  Mail, 
  CheckCircle, 
  XCircle, 
  User,
  UserX,
  Share2,
  Send,
  Copy
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { InviteDialog } from "@/features/collaboration/components";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  packingListId: number;
}

interface Collaborator {
  id: number;
  packingListId: number;
  userId: number;
  username: string;
  createdAt: string;
}

interface Invitation {
  id: number;
  packingListId: number;
  email: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

export default function ShareModal({ 
  open, 
  onClose,
  packingListId
}: ShareModalProps) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [removeCollaboratorId, setRemoveCollaboratorId] = useState<number | null>(null);
  const [cancelInvitationId, setCancelInvitationId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch collaborators for this packing list
  const { data: collaborators = [], isLoading: isLoadingCollaborators } = useQuery<Collaborator[]>({
    queryKey: [`/api/packing-lists/${packingListId}/collaborators`],
    enabled: open
  });

  // Fetch pending invitations for this packing list
  const { data: invitations = [], isLoading: isLoadingInvitations } = useQuery<Invitation[]>({
    queryKey: [`/api/packing-lists/${packingListId}/invitations`],
    enabled: open
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest('POST', `/api/packing-lists/${packingListId}/invitations`, {
        email: email.trim(),
        role: 'editor'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/invitations`] });
      toast({
        title: "Invitation Sent",
        description: "The invitation has been sent successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Invitation",
        description: error.message || "There was an error sending the invitation.",
        variant: "destructive",
      });
    }
  });

  const removeCollaboratorMutation = useMutation({
    mutationFn: async (collaboratorId: number) => {
      return await apiRequest('DELETE', `/api/packing-lists/${packingListId}/collaborators/${collaboratorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/collaborators`] });
      setRemoveCollaboratorId(null);
      toast({
        title: "Collaborator Removed",
        description: "The collaborator has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Removing Collaborator",
        description: error.message || "Failed to remove collaborator.",
        variant: "destructive",
      });
      setRemoveCollaboratorId(null);
    }
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      return await apiRequest('DELETE', `/api/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/invitations`] });
      setCancelInvitationId(null);
      toast({
        title: "Invitation Cancelled",
        description: "The invitation has been cancelled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Cancelling Invitation",
        description: error.message || "Failed to cancel invitation.",
        variant: "destructive",
      });
      setCancelInvitationId(null);
    }
  });

  const confirmRemoveCollaborator = () => {
    if (removeCollaboratorId) {
      removeCollaboratorMutation.mutate(removeCollaboratorId);
    }
  };

  const confirmCancelInvitation = () => {
    if (cancelInvitationId) {
      cancelInvitationMutation.mutate(cancelInvitationId);
    }
  };

  const copyInvitationLink = async (token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({
        title: "Link Copied",
        description: "Invitation link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <SideDialog open={open} onOpenChange={(open) => !open && onClose()}>
        <SideDialogContent>
          <SideDialogHeader>
            <SideDialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share Packing List
            </SideDialogTitle>
            <SideDialogDescription>
              Invite others to collaborate on this packing list. Everyone has full access to create, edit, and delete items.
            </SideDialogDescription>
          </SideDialogHeader>

          <div className="py-4 space-y-6">
            {/* Invite New Collaborator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Invite New Collaborator
                </CardTitle>
                <CardDescription>
                  Send an invitation to collaborate on this packing list
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => setShowInviteDialog(true)}
                  className="w-full"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Create Invitation Link
                </Button>
              </CardContent>
            </Card>

            {/* Current Collaborators */}
            {collaborators.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Active Collaborators ({collaborators.length})
                  </CardTitle>
                  <CardDescription>
                    People with access to this packing list
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {collaborators.map((collaborator) => (
                      <div key={collaborator.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {collaborator.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{collaborator.username}</p>
                            <p className="text-sm text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Accepted
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRemoveCollaboratorId(collaborator.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-yellow-500" />
                    Pending Invitations ({invitations.length})
                  </CardTitle>
                  <CardDescription>
                    Invitations that haven't been accepted yet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {invitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              <Mail className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{invitation.email}</p>
                            <p className="text-sm text-yellow-600 flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              Not Accepted
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInvitationLink(invitation.token)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2"
                            title="Copy invitation link"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCancelInvitationId(invitation.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                            title="Cancel invitation"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {collaborators.length === 0 && invitations.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No collaborators yet. Send an invitation to get started!</p>
              </div>
            )}
          </div>
        </SideDialogContent>

      {/* Invite Dialog */}
      <InviteDialog
        packingListId={packingListId}
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
      />
      </SideDialog>

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
              Are you sure you want to cancel this invitation? The recipient will no longer be able to accept it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancelInvitation}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              Cancel Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}