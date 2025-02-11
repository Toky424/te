import ora from "ora";
import dotenv from "dotenv";
import { callAuth0Cli, checkForAuth0Cli } from "./callAuth0Cli";

dotenv.config();

export const main = async () => {
  // Check CLI installation
  await checkForAuth0Cli();

  let streamId: string = null;
  // Check for existing stream
  const checkForExistingStream = ora({
    text: `Check for existing stream`,
  }).start();
  try {
    const stdout = await callAuth0Cli(["api", "get", "event-streams"]);
    // const stdout = await callAuth0Cli(["tenants", "list"]);
    const response = JSON.parse(stdout);
    const stream = response.eventStreams.find(
      (stream: { name: string }) =>
        stream?.name === process.env.EVENT_STREAM_NAME
    );
    if (!stream) {
      const message = `The ${process.env.EVENT_STREAM_NAME} does not exist, you can now run the create script`;
      checkForExistingStream.fail(message);
      console.log(message);
      process.exit(1);
    }
    streamId = stream.id;
    checkForExistingStream.succeed();
  } catch (e) {
    checkForExistingStream.fail(`Failed to check for existing stream`);
    console.error(e);
    process.exit(1);
  }

  // Delete the stream
  const deleteStream = ora({
    text: `Delete ${process.env.EVENT_STREAM_NAME} stream`,
  }).start();
  try {
    const stdout = await callAuth0Cli([
      "api",
      "delete",
      `event-streams/${streamId}`,
    ]);
    deleteStream.succeed();
  } catch (e) {
    deleteStream.fail(`Failed to delete the stream`);
    console.error(e);
    process.exit(1);
  }
};

main().then(() => console.log(`Done cleaning up`));
