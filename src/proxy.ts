import { clerkMiddleware } from "@clerk/nextjs/server";

// Public-first: the studio gates AI/Convex client-side via SignInButton.
// Middleware still hydrates auth for Server Components and API routes.
//
// Dev note: run Next on hostname `localhost` (not 127.0.0.1). Clerk/Next
// handshake rewrites use localhost; binding only to 127.0.0.1 causes
// "Failed to proxy http://localhost:3000/" socket hang-ups.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk-specific frontend API routes
    "/__clerk/(.*)",
  ],
};
