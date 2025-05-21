import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
import { useInvitation } from "../hooks";

interface InvitationHandlerProps {
  token: string;
}

export default function InvitationHandler({ token }: InvitationHandlerProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState<
    "loading" | "invalid" | "expired" | "accepted" | "error" | "unauthorized"
  >("loading");
  
  // Use the custom invitation hook
  const { 
    invitation, 
    isLoading, 
    isError,
    acceptInvitation 
  } = useInvitation({ token });
  
  // Effect to update status based on invitation data
  useEffect(() => {
    if (invitation) {
      // Check if invitation has expired
      if (new Date(invitation.expires) < new Date()) {
        setStatus("expired");
      }
    } else if (isError) {
      setStatus("invalid");
    }
  }, [invitation, isError]);

  // Check if user is logged in
  useEffect(() => {
    if (!isLoading && invitation) {
      if (!user) {
        setStatus("unauthorized");
      }
    }
  }, [isLoading, invitation, user]);

  const handleAcceptInvitation = async () => {
    try {
      const result = await acceptInvitation();
      setStatus("accepted");
      
      // Show success toast
      toast({
        title: "Invitation Accepted",
        description: "You are now a collaborator on this packing list",
      });
      
      // Redirect to the packing list after a short delay
      setTimeout(() => {
        if (result?.packingListId) {
          setLocation(`/list/${result.packingListId}`);
        } else if (invitation?.packingListId) {
          setLocation(`/list/${invitation.packingListId}`);
        } else {
          setLocation("/");
        }
      }, 2000);
    } catch (error: any) {
      setStatus("error");
      
      toast({
        title: "Error Accepting Invitation",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
    }
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
                {invitation.inviterName || `User #${invitation.invitedByUserId}` || "Unknown"}
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
            Error Accepting Invitation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            There was an error accepting the invitation. This could be because:
          </p>
          <ul className="list-disc pl-5 mb-4 text-gray-600 space-y-1">
            <li>The invitation has already been accepted</li>
            <li>The invitation has been revoked by the owner</li>
            <li>You don't have permission to accept this invitation</li>
            <li>There was a server error processing your request</li>
          </ul>
          <p className="text-gray-600">
            You can try again or contact the list owner for a new invitation.
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
                {invitation.inviterName || `User #${invitation.invitedByUserId}` || "Unknown"}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">List:</span>{" "}
                {invitation.packingList?.name || "Unknown Packing List"}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Role:</span>{" "}
                {invitation.permissionLevel}
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleDeclineInvitation}>
          Decline
        </Button>
        <Button onClick={handleAcceptInvitation}>
          Accept Invitation
        </Button>
      </CardFooter>
    </Card>
  );
}