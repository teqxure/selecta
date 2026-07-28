import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { getRequestMeta } from "@/lib/security/request-meta";
import { checkAssistantChatRateLimit } from "@/lib/security/rate-limit";
import { formatZodError } from "@/lib/errors";
import { assistantChatRequestSchema } from "@/lib/validators/assistant";
import { streamAssistantReply, type AssistantStreamEvent } from "@/services/ai/marketplace-assistant.service";

export const runtime = "nodejs";

/**
 * The app's one and only streaming endpoint. Everything else here is
 * Server Components + Server Actions, which resolve once and can't
 * progressively flush to the browser — token-by-token output requires a
 * real HTTP response backed by a ReadableStream, which only a Route
 * Handler can produce. Not covered by proxy.ts's cookie-only auth pass
 * (its matcher excludes /api), so auth and rate limiting are both done
 * here, from scratch.
 */
export async function POST(request: NextRequest) {
  const user = await currentUser();
  const { ipAddress } = await getRequestMeta();
  const identifier = user ? user.id : `guest:${ipAddress ?? "unknown"}`;

  const rateLimit = await checkAssistantChatRateLimit(identifier);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many messages — please slow down and try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = assistantChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of streamAssistantReply({ user: user ? { id: user.id } : null, ...parsed.data })) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
      } catch {
        const errorEvent: AssistantStreamEvent = { type: "error", message: "Something went wrong — please try again." };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
