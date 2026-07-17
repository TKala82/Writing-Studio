"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import {
  ConvexProviderWithAuth,
  ConvexReactClient,
} from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useState } from "react";
import { Toaster } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";

interface AppProvidersProps {
  children: React.ReactNode;
  clerkEnabled: boolean;
  convexUrl: string;
}

function makeConvexClient(url: string): ConvexReactClient {
  return new ConvexReactClient(url);
}

function useDisabledAuth() {
  return {
    isLoading: false,
    isAuthenticated: false,
    fetchAccessToken: async () => null,
  };
}

export function AppProviders({
  children,
  clerkEnabled,
  convexUrl,
}: AppProvidersProps) {
  const [convex] = useState(() => makeConvexClient(convexUrl));
  const content = (
    <TooltipProvider>
      {children}
      <Toaster position="bottom-right" richColors />
    </TooltipProvider>
  );

  if (!clerkEnabled) {
    return (
      <ConvexProviderWithAuth client={convex} useAuth={useDisabledAuth}>
        {content}
      </ConvexProviderWithAuth>
    );
  }

  return (
    <ClerkProvider appearance={{ theme: shadcn }}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {content}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
