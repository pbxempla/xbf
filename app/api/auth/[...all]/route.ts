import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

export const POST = async (req: Request) => {
  const url = new URL(req.url);

  // Seamless passwordless bridge: if client calls /email-otp/verify-email,
  // ensure automatic user creation with initial credits & session issuance
  if (url.pathname.endsWith("/email-otp/verify-email")) {
    try {
      const cloned = req.clone();
      const body = await cloned.json();
      if (body?.email && body?.otp) {
        const response = await auth.api.signInEmailOTP({
          body: {
            email: body.email,
            otp: body.otp,
          },
          asResponse: true,
        });
        if (response.ok) {
          return response;
        }
      }
    } catch {
      // Continue to default Better Auth handler
    }
  }

  return handlers.POST(req);
};
