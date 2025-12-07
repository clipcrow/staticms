import { app } from "@/server/app.ts";

const PORT = 8000;
console.log(`Server running on http://localhost:${PORT}`);
await app.listen({ port: PORT });
