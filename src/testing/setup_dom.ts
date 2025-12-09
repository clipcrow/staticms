import { afterEach } from "@std/testing/bdd";
import { cleanup } from "@testing-library/react";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Setup HappyDOM environment
GlobalRegistrator.register({
  url: "http://localhost/",
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});
