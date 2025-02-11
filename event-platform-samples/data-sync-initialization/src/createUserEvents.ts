import dotenv from "dotenv";

import {
  createUsers,
  triggerDeletes,
  triggerEventsStage1,
  triggerEventsStage2,
  triggerEventsStage3,
} from "./loadTestData";
import { waitForUsersToBeDeleted, waitForUsersToMatch } from "./hubspot";
import { checkForAuth0Cli } from "./callAuth0Cli";

dotenv.config();

const initializeSystem = async () => {
  // Check CLI installation
  await checkForAuth0Cli();

  // Create initial users
  await createUsers();

  // Trigger a couple of events (an update and a user create)
  await triggerEventsStage1();

  // Trigger a couple more events
  await triggerEventsStage2();

  // process a few more events
  await triggerEventsStage3();

  // wait for all users to be in hubspot with locale matching email, give up after 5 minutes
  let beforeWait = Date.now();
  await waitForUsersToMatch();

  console.log(
    `Done waiting, we waited for ${((Date.now() - beforeWait) / 1000.0).toFixed(
      2
    )} seconds`
  );

  await triggerDeletes();
  beforeWait = Date.now();
  await waitForUsersToBeDeleted();

  console.log(
    `Done waiting, we waited users to be deleted for ${(
      (Date.now() - beforeWait) /
      1000.0
    ).toFixed(2)} seconds`
  );
};

initializeSystem().then(() => console.log("Done"));
