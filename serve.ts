import { shutdown, staticms } from "./src/server/staticms.ts";

const controller = new AbortController();
const { signal } = controller;

const STATICMS_PORT = Number(Deno.env.get("STATICMS_PORT") || 3030);

console.log(`Server listening on http://localhost:${STATICMS_PORT}`);

const listenPromise = staticms.listen({ port: STATICMS_PORT, signal });

Deno.addSignalListener("SIGINT", () => {
  console.log("\nSIGINT received, shutting down...");
  controller.abort();
  try {
    shutdown();
    console.log("KV database closed.");
  } catch (e) {
    console.error("Error closing KV:", e);
  }
  console.log("Exiting...");
  Deno.exit(0);
});

try {
  await listenPromise;
} catch (e) {
  if (e instanceof Error && e.name === "AbortError") {
    // Ignore AbortError
  } else {
    console.error("Server error:", e);
  }
}
