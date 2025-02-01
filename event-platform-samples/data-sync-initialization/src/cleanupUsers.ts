import dotenv from "dotenv";

import { deleteExistingUsers } from "./loadTestData";

import { deleteExistingHubspotUsers } from "./hubspot";
import { checkForAuth0Cli } from "./callAuth0Cli";

dotenv.config();

const initializeSystem = async () => {
  // Check CLI installation
  await checkForAuth0Cli();

  // find all users and delete those that start with, if streams are enabled, this should hopefully remove them from hubspot too
  await deleteExistingUsers();

  // Make sure hubspot is in a clean state
  await deleteExistingHubspotUsers();
};

initializeSystem().then(() => console.log("Done"));
