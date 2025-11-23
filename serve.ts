import { shutdown, staticms } from "./src/server/staticms.ts";

const controller = new AbortController();
const { signal } = controller;

const STATICMS_PORT = Number(Deno.env.get("STATICMS_PORT") || 3030);

console.log(`Server listening on http://localhost:${STATICMS_PORT}`);

const listenPromise = staticms.listen({ port: STATICMS_PORT, signal });

const handleShutdown = () => {
  try {
    console.log("\nSignal received, shutting down...");
    controller.abort();
    shutdown();
    console.log("KV database closed.");
  } catch (e) {
    console.error("Error during shutdown:", e);
  } finally {
    console.log("Exiting now.");
    Deno.exit(0);
  }
};

const signals: Deno.Signal[] = ["SIGINT", "SIGTERM"];
for (const sig of signals) {
  try {
    Deno.addSignalListener(sig, handleShutdown);
  } catch (e) {
    // SIGHUP might not be supported on all platforms/versions in Deno types yet,
    // or might fail if not allowed. We'll stick to SIGINT/SIGTERM for now
    // or wrap in try/catch if we want to add SIGHUP.
    console.warn(`Failed to add listener for ${sig}:`, e);
  }
}

// Attempt to add SIGHUP separately as it might throw on Windows or if not supported
try {
  Deno.addSignalListener("SIGHUP", handleShutdown);
} catch (_e) {
  // Ignore
}

try {
  await listenPromise;
} catch (e) {
  if (e instanceof Error && e.name === "AbortError") {
    // Ignore AbortError
  } else {
    console.error("Server error:", e);
  }
}
