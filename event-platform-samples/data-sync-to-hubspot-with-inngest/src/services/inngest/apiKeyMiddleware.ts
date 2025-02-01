import { InngestMiddleware, NonRetriableError } from "inngest";

export const apiKeyMiddleware = new InngestMiddleware({
  name: "Verify API Key Middleware",
  init() {
    return {
      onFunctionRun({ ctx }) {
        return {
          beforeExecution() {
            const headers = ctx.event.data.headers || {};
            let verified = false;
            for (const key in headers) {
              if (key.toLowerCase() === "authorization") {
                verified = headers[key] === `Bearer ${process.env.API_TOKEN}`;
                break;
              }
            }

            if (!verified) {
              throw new NonRetriableError("API Key invalid");
            }
          },
        };
      },
    };
  },
});
