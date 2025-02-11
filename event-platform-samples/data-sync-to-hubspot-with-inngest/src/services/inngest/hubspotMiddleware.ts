import { InngestMiddleware } from "inngest";
import { HubspotClientService } from "../hubspot";

export const hubspotMiddleware = new InngestMiddleware({
  name: "Hubspot Client Middleware",
  init() {
    const hubspot = new HubspotClientService();

    return {
      onFunctionRun() {
        return {
          transformInput() {
            return {
              // Anything passed via `ctx` will be merged with the function's arguments
              ctx: {
                hubspot,
              },
            };
          },
        };
      },
    };
  },
});
