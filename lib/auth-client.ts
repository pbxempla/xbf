import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

// No baseURL: the client calls /api/auth on whatever origin served the page, so changing
// the dev port never sends the browser back to a different host or port.
export const authClient = createAuthClient({
  plugins: [emailOTPClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
