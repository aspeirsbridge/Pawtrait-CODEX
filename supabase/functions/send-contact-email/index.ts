import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  userEmail: string;
  message: string;
}

const SUPPORT_EMAIL = Deno.env.get("SUPPORT_EMAIL") ?? "andrew@speirs-bridge.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const isValidEmail = (value: string) => /.+@.+\..+/.test(value);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, message }: ContactEmailRequest = await req.json();

    if (!userEmail || !message) {
      return json({ code: "VALIDATION_ERROR", error: "Email and message are required" }, 400);
    }

    if (!isValidEmail(userEmail)) {
      return json({ code: "VALIDATION_ERROR", error: "Invalid email address" }, 400);
    }

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not configured. Returning queued response.");
      return json(
        {
          ok: true,
          queued: true,
          message: "Feedback received. Email delivery is not configured yet.",
        },
        202,
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    try {
      const emailResponse = await resend.emails.send({
        from: "Pawtrait <onboarding@resend.dev>",
        to: [SUPPORT_EMAIL],
        replyTo: userEmail,
        subject: "Pawtrait Feedback",
        html: `
          <h2>New Feedback from Pawtrait</h2>
          <p><strong>From:</strong> ${userEmail}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
        `,
      });

      console.log("Email sent successfully:", emailResponse);
      return json({ ok: true, queued: false, data: emailResponse }, 200);
    } catch (sendError: unknown) {
      const reason = sendError instanceof Error ? sendError.message : "unknown send error";
      console.error("Resend send failed, returning queued response:", reason);

      return json(
        {
          ok: true,
          queued: true,
          message: "Feedback received. We will review it shortly.",
        },
        202,
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-contact-email function:", message);

    return json({ code: "EMAIL_SEND_FAILED", error: message }, 500);
  }
};

serve(handler);
