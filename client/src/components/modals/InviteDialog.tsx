import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, CheckCircle2 } from "lucide-react";

interface InviteDialogProps {
  packingListId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InviteDialog({ 
  packingListId, 
  open, 
  onOpenChange 
}: InviteDialogProps) {
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<string>("viewer");
  const [invitationLink, setInvitationLink] = useState<string>("");
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Create invitation mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/packing-lists/${packingListId}/invitations`, {
        email,
        role
      });
    },
    onSuccess: async (response) => {
      // Parse the response to get the invitation token
      const data = await response.json();
      
      // Create invitation link
      const baseUrl = window.location.origin;
      const invitationUrl = `${baseUrl}/invitation/${data.token}`;
      setInvitationLink(invitationUrl);
      
      // Show success toast
      toast({
        title: "Invitation Created",
        description: "The invitation has been created and is ready to share",
      });
      
      // Invalidate collaborators query
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/collaborators`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/invitations`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create invitation",
        variant: "destructive",
      });
    }
  });

  const handleGenerateLink = () => {
    // Validate email
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    // Create invitation
    inviteMutation.mutate();
  };
  
  const handleCopyLink = async () => {
    if (invitationLink) {
      try {
        await navigator.clipboard.writeText(invitationLink);
        setLinkCopied(true);
        toast({
          title: "Link Copied",
          description: "Invitation link copied to clipboard",
        });
        
        // Reset copied state after 3 seconds
        setTimeout(() => {
          setLinkCopied(false);
        }, 3000);
      } catch (err) {
        toast({
          title: "Copy Failed",
          description: "Could not copy the link to clipboard",
          variant: "destructive",
        });
      }
    }
  };
  
  const handleClose = () => {
    // Reset form state
    setEmail("");
    setRole("viewer");
    setInvitationLink("");
    setLinkCopied(false);
    
    // Close dialog
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Collaborator</DialogTitle>
          <DialogDescription>
            Invite someone to collaborate on this packing list.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="collaborator@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Role
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role" className="col-span-3">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer (Can view only)</SelectItem>
                <SelectItem value="editor">Editor (Can edit items)</SelectItem>
                <SelectItem value="admin">Admin (Full access)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {invitationLink && (
            <div className="grid grid-cols-4 items-center gap-4 mt-2">
              <Label htmlFor="link" className="text-right">
                Link
              </Label>
              <div className="col-span-3 flex">
                <Input
                  id="link"
                  value={invitationLink}
                  readOnly
                  className="flex-1 rounded-r-none font-mono text-xs"
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="rounded-l-none" 
                  onClick={handleCopyLink}
                >
                  {linkCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          
          {!invitationLink ? (
            <Button 
              type="button" 
              onClick={handleGenerateLink}
              disabled={inviteMutation.isPending || !email}
            >
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Invitation Link"
              )}
            </Button>
          ) : (
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                setInvitationLink("");
                setEmail("");
              }}
            >
              Create Another
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}