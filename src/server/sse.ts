import { ServerSentEventTarget } from "@oak/oak";

const clients = new Set<ServerSentEventTarget>();

export const addClient = (target: ServerSentEventTarget) => {
  clients.add(target);
  console.log(`SSE Client connected. Total clients: ${clients.size}`);

  target.addEventListener("close", () => {
    clients.delete(target);
    console.log(`SSE Client disconnected. Total clients: ${clients.size}`);
  });
};

export const broadcastMessage = (message: Record<string, unknown>) => {
  const data = JSON.stringify(message);
  for (const client of clients) {
    client.dispatchMessage(data);
  }
};
