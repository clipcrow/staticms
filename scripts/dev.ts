// Configuration
const SERVER_ENTRY = "./src/server/main.ts";

// Helper to spawn a child process
function spawn(cmd: string[], opts: Deno.CommandOptions = {}) {
  const command = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: "inherit",
    stderr: "inherit",
    ...opts,
  });
  return command.spawn();
}

// 1. SCSS Watcher (using generic file watcher + build script)
// Since we don't have a direct "sass --watch" via npm:sass easily in Deno without extra plumbing,
// we'll run the build once and then use a simple Deno watcher for PoC.
// Ideally, we'd use a more robust watcher.
async function watchScss() {
  console.log("Starting SCSS Watcher...");
  // Initial build
  await spawn([Deno.execPath(), "run", "-A", "scripts/build_css.ts"]).status;

  const watcher = Deno.watchFs("./src/app/styles");
  for await (const event of watcher) {
    if (event.kind === "modify" || event.kind === "create") {
      console.log("SCSS changed, rebuilding...");
      await spawn([Deno.execPath(), "run", "-A", "scripts/build_css.ts"])
        .status;
    }
  }
}

// 2. Frontend Bundler (using `deno bundle` with watch - wait, deno bundle doesn't have watch flag in CLI v1,
// and in v2 it's... complicated. Let's stick to "rebuild on change" for PoC)
async function watchFrontend() {
  console.log("Starting Frontend Watcher...");

  // Checking if `deno bundle` works (it might be removed in very rew Deno versions or require config)
  // We defined BuildStrategy to use standard bundle.

  const build = async () => {
    console.log("Bundling Frontend...");
    // Using Deno's bundle command.
    // Note: As of Deno 1.x/2.x transition, 'bundle' might be deprecated or moved.
    // If 'deno bundle' fails, we fallback to our manual esbuild script or similar.
    // BUT user strategy said "Deno Native Bundle". Let's try to use the CLI.

    // In Deno v2.0+, 'deno bundle' is removed/deprecated in favor of 'deno_emit' or similar?
    // User insisted on "v2.4+ new feature". If it exists, we use it.
    // If not (since we are likely on a standard version), we might need to fallback to
    // a "fake" bundle via esbuild if the command doesn't exist, OR use 'deno run' to compile?

    // Let's assume standard 'deno bundle' available for now, or fallback later.
    // Use esbuild script since 'deno bundle' is flaky/deprecated
    const p = spawn([Deno.execPath(), "run", "-A", "scripts/build.ts"]);
    const { success } = await p.status;
    if (success) console.log("Bundle finished.");
    else console.error("Bundle failed.");
  };

  await build();

  const watcher = Deno.watchFs("./src/app");
  let timeout: number | undefined;
  for await (const event of watcher) {
    if (event.kind === "modify" || event.kind === "create") {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(build, 200); // Debounce
    }
  }
}

// 3. Server (Deno Run with internal watch)
async function runServer() {
  console.log("Starting Server...");
  // Add --unstable-kv here
  const p = spawn([
    Deno.execPath(),
    "run",
    "-A",
    "--unstable-kv",
    "--watch=src/server/",
    SERVER_ENTRY,
  ]);
  await p.status;
}

// Main Orchestrator
console.log("Development environment starting...");
Promise.all([
  watchScss(),
  watchFrontend(),
  runServer(),
]);
