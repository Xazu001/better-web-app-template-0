import { createApp } from "./setup";

/**
 * Main server entry point.
 *
 * Creates and exports a Hono application instance with all services middleware configured.
 * This serves as the foundation for the API server.
 */
const app = createApp();

export default app;
