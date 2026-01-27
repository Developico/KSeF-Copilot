"use client";
import Image from "next/image";
import { LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "./auth-provider";

interface SignInScreenProps { 
  productName?: string; 
}

export function SignInScreen({ productName = "KSeF" }: SignInScreenProps) {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (loading) return; // Prevent double clicks
    
    setLoading(true);
    try {
      // Add minimum delay to ensure loader is visible
      await Promise.all([
        login(),
        new Promise(resolve => setTimeout(resolve, 500)) // Minimum 500ms delay
      ]);
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(false);
    }
    // Note: Don't set loading to false here as user should be redirected
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 md:px-8 bg-background relative">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">Redirecting to Microsoft...</p>
          </div>
        </div>
      )}
      
      <div className={`w-full max-w-md rounded-xl border bg-card/50 backdrop-blur-sm shadow-sm p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="h-14 w-14 relative rounded-lg ring-1 ring-border/40 overflow-hidden shadow-sm bg-background">
            <Image src="/developico-logo.png" alt="Developico" fill className="object-contain p-2" priority />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Welcome Back</h1>
            <p className="text-sm text-muted-foreground">Sign in to access {productName}</p>
          </div>
        </div>
        <div>
          <Button
            onClick={handleSignIn}
            className="w-full gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:shadow active:translate-y-[1px]"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            <span>{loading ? 'Signing in…' : 'Sign in with Microsoft'}</span>
          </Button>
        </div>
        <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
          You agree to appropriate use and monitoring. Unauthorized users have no access.
        </p>
      </div>
    </div>
  );
}
