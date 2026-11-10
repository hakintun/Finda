import { getDBVersion, subscribeDBChanges } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;
  let diskPoll: ReturnType<typeof setInterval> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      let lastSentVersion = getDBVersion();

      const send = (obj: { version: number; updatedAt?: string }) => {
        lastSentVersion = obj.version;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
          );
        } catch {
          // stream already closed
        }
      };

      // Send initial version snapshot immediately
      send({ version: lastSentVersion });

      // 0ms in-process broadcast
      cleanup = subscribeDBChanges((payload) => {
        if (payload.version !== lastSentVersion) {
          send(payload);
        }
      });

      // Cross-worker / Turbopack fallback: lightweight statSync check every 750ms
      diskPoll = setInterval(() => {
        const current = getDBVersion();
        if (current !== lastSentVersion) {
          send({ version: current, updatedAt: new Date().toISOString() });
        }
      }, 750);

      // Keep proxy connections alive every 20s
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // ignore
        }
      }, 20_000);

      req.signal.addEventListener("abort", () => {
        if (cleanup) cleanup();
        if (diskPoll) clearInterval(diskPoll);
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
    cancel() {
      if (cleanup) cleanup();
      if (diskPoll) clearInterval(diskPoll);
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
