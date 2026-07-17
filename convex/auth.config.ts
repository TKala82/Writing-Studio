import type { AuthConfig } from "convex/server";

const issuerDomain =
  process.env.CLERK_JWT_ISSUER_DOMAIN ??
  process.env.CLERK_FRONTEND_API_URL ??
  "https://clerk.example.invalid";

export default {
  providers: [
    {
      // Frontend API URL from the Clerk Convex JWT template / integration.
      domain: issuerDomain,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
