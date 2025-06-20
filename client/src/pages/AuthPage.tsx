import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Redirect, Link } from "wouter";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ username: "", password: "", confirmPassword: "" });
  const [activeTab, setActiveTab] = useState("login");

  // If user is already logged in, redirect to home page
  if (user) {
    return <Redirect to="/" />;
  }

  // Handle login form submission
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  // Handle register form submission
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerForm.password !== registerForm.confirmPassword) {
      return; // Passwords don't match
    }
    
    registerMutation.mutate({
      username: registerForm.username,
      password: registerForm.password
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Auth Form Section */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-10">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Welcome to TravelPack</CardTitle>
            <CardDescription>
              Sign in or create an account to manage your packing lists
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              {/* Login Form */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input 
                      id="login-email" 
                      type="email" 
                      placeholder="your.email@example.com" 
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input 
                      id="login-password" 
                      type="password" 
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : "Sign In"}
                  </Button>
                  
                  <div className="text-center mt-4">
                    <Link href="/forgot-password">
                      <Button variant="link" className="text-sm p-0">
                        Forgot your password?
                      </Button>
                    </Link>
                  </div>
                </form>
              </TabsContent>
              
              {/* Register Form */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input 
                      id="register-email" 
                      type="email" 
                      placeholder="your.email@example.com" 
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input 
                      id="register-password" 
                      type="password" 
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Confirm Password</Label>
                    <Input 
                      id="register-confirm-password" 
                      type="password" 
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      required
                    />
                    {registerForm.password !== registerForm.confirmPassword && registerForm.confirmPassword && (
                      <p className="text-sm text-red-500">Passwords do not match</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={registerMutation.isPending || registerForm.password !== registerForm.confirmPassword}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-muted-foreground">
            By continuing, you agree to our terms of service and privacy policy.
          </CardFooter>
        </Card>
      </div>
      
      {/* Hero Section */}
      <div className="flex-1 bg-gradient-to-b from-primary to-primary/80 text-white p-8 flex flex-col justify-center items-center">
        <div className="max-w-md space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold">Organize Your Travels with TravelPack</h1>
          <p className="text-lg md:text-xl opacity-90">
            The ultimate packing companion for all your adventures. Never forget essential items again.
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div>
                <h3 className="font-medium">Smart Organization</h3>
                <p className="opacity-80">Organize items by categories, bags, and travelers</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div>
                <h3 className="font-medium">Track Progress</h3>
                <p className="opacity-80">Monitor your packing progress with visual indicators</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div>
                <h3 className="font-medium">Export Your Lists</h3>
                <p className="opacity-80">Export your packing lists as CSV for offline use</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}