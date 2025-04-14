import { useState, useEffect } from "react";
import { useLocation, useLocation as useWouterLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface InvitationHandlerProps {
  token: string;
}

interface InvitationData {
  id: number;
  packingListId: number;
  email: string;
  token: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  packingList?: {
    id: number;
    name: string;
  };
  inviter?: {
    id: number;
    username: string;
  };
}

export default function InvitationHandler({ token }: InvitationHandlerProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState<
    "loading" | "invalid" | "expired" | "accepted" | "error" | "unauthorized"
  >("loading");
  
  // Fetch invitation details
  const { data: invitation, isLoading, error } = useQuery<InvitationData>({
    queryKey: [`/api/invitations/${token}`],
    enabled: !!token,
    retry: false,
    staleTime: 0,
  });
  
  // Effect to update status based on invitation data
  useEffect(() => {
    if (invitation) {
      // Check if invitation has expired
      if (new Date(invitation.expiresAt) < new Date()) {
        setStatus("expired");
      }
    } else if (error) {
      setStatus("invalid");
    }
  }, [invitation, error]);

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/invitations/${token}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packing-lists'] });
      setStatus("accepted");
      
      // Show success toast
      toast({
        title: "Invitation Accepted",
        description: "You are now a collaborator on this packing list",
      });
      
      // Redirect to the packing list after a short delay
      setTimeout(() => {
        if (invitation?.packingList?.id) {
          setLocation(`/list/${invitation.packingList.id}`);
        } else {
          setLocation("/");
        }
      }, 2000);
    },
    onError: () => {
      setStatus("error");
      toast({
        title: "Error",
        description: "Failed to accept invitation",
        variant: "destructive",
      });
    }
  });

  // Check if user is logged in
  useEffect(() => {
    if (!isLoading && invitation) {
      if (!user) {
        setStatus("unauthorized");
      }
    }
  }, [isLoading, invitation, user]);

  const handleAcceptInvitation = () => {
    acceptInvitationMutation.mutate();
  };

  const handleDeclineInvitation = () => {
    // Just redirect to home for now
    setLocation("/");
    toast({
      title: "Invitation Declined",
      description: "You have declined the invitation",
    });
  };

  // Handle login redirect
  const handleLogin = () => {
    // Redirect to login page with the invitation token as a parameter
    // so the user can be redirected back after login
    setLocation(`/auth?invitation=${token}`);
  };

  if (isLoading || status === "loading") {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded-lg shadow-md">
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg text-gray-600">Loading invitation details...</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <Card className="max-w-md mx-auto mt-12 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-red-500">
            <XCircle className="h-6 w-6 mr-2" />
            Invalid Invitation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            This invitation link is invalid or has been used already.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (status === "expired") {
    return (
      <Card className="max-w-md mx-auto mt-12 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-amber-500">
            <XCircle className="h-6 w-6 mr-2" />
            Invitation Expired
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            This invitation has expired. Please ask the list owner to send a new invitation.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (status === "unauthorized") {
    return (
      <Card className="max-w-md mx-auto mt-12 shadow-md">
        <CardHeader>
          <CardTitle>Login Required</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            You need to be logged in to accept this invitation.
          </p>
          {invitation && (
            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <p className="text-sm font-medium mb-1">Invitation Details:</p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">From:</span>{" "}
                {invitation.inviter?.username || "Unknown"}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">List:</span>{" "}
                {invitation.packingList?.name || "Unknown Packing List"}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setLocation("/")}>
            Cancel
          </Button>
          <Button onClick={handleLogin}>
            Log In
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (status === "accepted") {
    return (
      <Card className="max-w-md mx-auto mt-12 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-green-500">
            <CheckCircle2 className="h-6 w-6 mr-2" />
            Invitation Accepted
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            You are now a collaborator on this packing list. Redirecting you to the list...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="max-w-md mx-auto mt-12 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-red-500">
            <XCircle className="h-6 w-6 mr-2" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            There was an error accepting the invitation. Please try again.
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setLocation("/")}>
            Go to Dashboard
          </Button>
          <Button onClick={handleAcceptInvitation}>
            Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto mt-12 shadow-md">
      <CardHeader>
        <CardTitle>Collaboration Invitation</CardTitle>
      </CardHeader>
      <CardContent>
        {invitation && (
          <div>
            <p className="text-gray-600 mb-4">
              You've been invited to collaborate on a packing list.
            </p>
            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <p className="text-sm font-medium mb-1">Invitation Details:</p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">From:</span>{" "}
                {invitation.inviter?.username || "Unknown"}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">List:</span>{" "}
                {invitation.packingList?.name || "Unknown Packing List"}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Role:</span>{" "}
                {invitation.role}
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleDeclineInvitation}>
          Decline
        </Button>
        <Button 
          onClick={handleAcceptInvitation}
          disabled={acceptInvitationMutation.isPending}
        >
          {acceptInvitationMutation.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Accepting...</>
          ) : (
            "Accept Invitation"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}