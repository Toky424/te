import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import {
  createUser,
  deleteUser,
  diffUser,
  getUser,
  updateUser,
  UserEvent,
} from "./hubspot";

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(
  bodyParser.json({
    type: () => true,
  })
);

const checkApiKey = () => (req: Request, res: Response, next: NextFunction) => {
  if (
    req.headers.authorization &&
    req.headers.authorization === `Bearer ${process.env.API_TOKEN}`
  ) {
    return next();
  }

  return res.status(401).json({
    error: "Unauthorized",
    error_description: "Call is not authorized",
  });
};

app.use(checkApiKey());

app.post(
  "/webhook",
  async (req: Request, res: Response) => {
    console.log("Received Event: ", req.body);

    try {
      const ignoreBeforeTimestamp = new Date(process.env.IGNORE_DATE).getTime();

      const userEvent: UserEvent = req.body;

      const eventTimestamp = new Date(userEvent.time).getTime();

      if (ignoreBeforeTimestamp > eventTimestamp) {
        console.log(
          `Ignoring old event: ${new Date(
            ignoreBeforeTimestamp
          ).toISOString()} > ${new Date(eventTimestamp).toISOString()}`
        );
        return res.status(204).send();
      }

      const user = await getUser(req.body);

      switch (userEvent.type) {
        case "user.created":
        case "user.initialized":
          if (user) {
            console.log("skipping user because it already exists: ", user);
            diffUser(user, userEvent);
            break;
          }
        case "user.updated":
          if (!user) {
            await createUser(req.body);
            break;
          }
          const userTimestamp = parseInt(user.auth0_last_event_timestamp);
          const eventTimestamp = new Date(userEvent.time).getTime();
          // Check event time vs last event processed on the user
          if (eventTimestamp > userTimestamp) {
            await updateUser(user, userEvent);
            break;
          }
          console.log(
            `Not updating user because ${eventTimestamp} <= ${userTimestamp}`
          );
          break;
        case "user.deleted":
          if (!user) {
            console.log("Can't delete non-existing user");
            break;
          }

          await deleteUser(user);
          break;
      }

      return res.status(204).send();
    } catch (e) {
      console.error("Failed to process event", e);
      console.error(e.message);

      return res.status(500).json({
        error: "Failed to process user",
        error_description: e.message,
      });
    }
  }
);

app.listen(port, () => {
  return console.log(`Server is listening on ${port}`);
});
