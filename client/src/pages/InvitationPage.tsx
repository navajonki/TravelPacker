import { useParams } from "wouter";
import Header from "@/components/Header";
import InvitationHandler from "@/components/InvitationHandler";

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-background p-4">
          <InvitationHandler token={token} />
        </div>
      </div>
    </div>
  );
}