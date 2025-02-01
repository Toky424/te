import { Inngest } from "inngest";
import { apiKeyMiddleware } from "./apiKeyMiddleware";
import { hubspotMiddleware } from "./hubspotMiddleware";
import { ignoreOldEventsMiddleware } from "./ignoreOldEventsMiddleware";

// Create a client to send and receive events
export const client = new Inngest({
  id: "sync-with-hubspot",
  middleware: [ignoreOldEventsMiddleware, apiKeyMiddleware, hubspotMiddleware],
});
