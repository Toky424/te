// src/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { client } from "@/services/inngest/client";
import { handleAuth0Event } from "@/services/inngest/functions"; // Your own functions

export const { GET, POST, PUT } = serve({
  client,
  functions: [handleAuth0Event],
});
