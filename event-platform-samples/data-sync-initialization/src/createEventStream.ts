import ora from "ora";
import dotenv from "dotenv";
import { callAuth0Cli, checkForAuth0Cli } from "./callAuth0Cli";

dotenv.config();

export const main = async () => {
  // Check CLI installation
  await checkForAuth0Cli();

  // Check for existing stream
  const checkForExistingStream = ora({
    text: `Check for existing stream`,
  }).start();
  try {
    const stdout = await callAuth0Cli(["api", "get", "event-streams"]);
    // const stdout = await callAuth0Cli(["tenants", "list"]);
    const response = JSON.parse(stdout);
    if (
      response.eventStreams.some(
        (stream: { name: string }) =>
          stream?.name === process.env.EVENT_STREAM_NAME
      )
    ) {
      const message = `The ${process.env.EVENT_STREAM_NAME} already exists, run the cleanup script`;
      checkForExistingStream.fail(message);
      console.log(message);
      process.exit(1);
    }
    checkForExistingStream.succeed();
  } catch (e) {
    checkForExistingStream.fail(`Failed to check for existing stream`);
    console.error(e);
    process.exit(1);
  }

  // Create new stream
  let eventStream: { id: string; name: string } | null = null;
  const createStream = ora({
    text: `Create ${process.env.EVENT_STREAM_NAME} stream`,
  }).start();
  try {
    const streamConfig = {
      name: process.env.EVENT_STREAM_NAME,
      subscriptions: [{ event_type: "user.created" }],
      destination: {
        type: "webhook",
        configuration: {
          webhook_endpoint: process.env.WEBHOOK_URL,
          webhook_authorization: {
            method: "bearer",
            token: process.env.API_TOKEN,
          },
        },
      },
    };

    const stdout = await callAuth0Cli([
      "api",
      "post",
      "event-streams",
      "--data",
      JSON.stringify(streamConfig),
    ]);
    const response = JSON.parse(stdout);
    eventStream = response;
    createStream.succeed();
  } catch (e) {
    createStream.fail(`Failed to create the stream`);
    console.error(e);
    process.exit(1);
  }

  // Create new stream
  const enableStream = ora({
    text: `Enable ${process.env.EVENT_STREAM_NAME} stream`,
  }).start();
  try {
    const stdout = await callAuth0Cli([
      "api",
      "patch",
      `event-streams/${eventStream.id}`,
      "--data",
      JSON.stringify({
        status: "enabled",
      }),
    ]);
    const response = JSON.parse(stdout);
    eventStream = response;
    enableStream.succeed();
  } catch (e) {
    enableStream.fail(`Failed to enable the stream`);
    console.error(e);
    process.exit(1);
  }

  return eventStream;
};

main().then((stream) =>
  console.log(`Done creating the stream: ${JSON.stringify(stream, null, 2)}`)
);
