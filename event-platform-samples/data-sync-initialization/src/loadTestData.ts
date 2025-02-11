import ora from "ora";
import { callAuth0Cli, checkForAuth0Cli } from "./callAuth0Cli";

type StageType = "initial" | "stage1" | "stage2" | "stage3";

const basicStages: StageType[] = ["initial", "stage1", "stage2", "stage3"];

interface User {
  user_id: string;
  email: string;
  user_metadata: {
    locale?: string;
  };
}

interface UserMap {
  [key: string]: User[];
}

export let users: UserMap = {};
export const userIdsDeleted: string[] = [];
let numberOfUsers = 0;

export const deleteExistingUsers = async () => {
  if (!process.env.USER_PREFIX || process.env.USER_PREFIX.length <= 0) {
    throw Error(
      "USER_PREFIX must be defined as a non-empty string in the environment"
    );
  }

  // find all users and delete those that start with, if streams are enabled, this should hopefully remove them from hubspot too
  let userIds: string[] = [];
  // Check for existing stream
  const findExistingUsers = ora({
    text: `Find Existing Users`,
  }).start();
  try {
    const args = [
      "users",
      "search",
      "--query",
      `email:"${process.env.USER_PREFIX}*"`,
      "--json",
    ];
    const stdout = await callAuth0Cli(args);
    // const stdout = await callAuth0Cli(["tenants", "list"]);
    const openSquareBracket = stdout.indexOf("[");
    const jsonString = stdout.substring(openSquareBracket);
    const users = JSON.parse(jsonString);
    userIds = users.map((user: { user_id: string }) => user.user_id);
    findExistingUsers.succeed();
  } catch (e) {
    findExistingUsers.fail(`Failed to check for existing users`);
    console.error(e);
    process.exit(1);
  }

  if (userIds.length > 0) {
    console.log(`Found ${userIds.length} users(s) delete them ...`);
    const deleteUsers = ora({
      text: `Delete Users`,
    }).start();
    try {
      for (const userId of userIds) {
        await callAuth0Cli(["users", "delete", `"${userId}"`]);
      }

      deleteUsers.succeed();
    } catch (e) {
      deleteUsers.fail(`Failed to check for existing users`);
      console.error(e);
      process.exit(1);
    }
  } else {
    console.log(`No Auth0 users to delete`);
  }
};

export const createUser = async (
  currentStage: StageType,
  finalStage: StageType
) => {
  if (!users[finalStage]) users[finalStage] = [];
  if (!process.env.USER_PREFIX || process.env.USER_PREFIX.length <= 0) {
    throw Error(
      "USER_PREFIX must be defined as a non-empty string in the environment"
    );
  }

  const user = {
    connection: process.env.CONNECTION_NAME,
    email: `${process.env.USER_PREFIX}_${Date.now()}_${finalStage}_${
      users[finalStage].length
    }@example.com`,
    password: `fakepwd1234!`,
    user_metadata: {
      locale: currentStage,
    },
  };

  const stdout = await callAuth0Cli([
    "api",
    "post",
    "users",
    "--data",
    `'${JSON.stringify(user)}'`,
  ]);
  const userData = JSON.parse(stdout);

  users[finalStage].push(userData as User);
};

export const createUsers = async (stages: StageType[] = basicStages) => {
  // clear out existing users
  users = {};

  numberOfUsers = 1;

  let numCreated = 0;
  const createUsers = ora({
    text: `Create Users`,
  }).start();
  try {
    for (const stage of stages) {
      for (let i = 0; i < numberOfUsers; ++i) {
        // create user
        await createUser("initial", stage);
        ++numCreated;
      }
    }
    createUsers.succeed();
  } catch (e) {
    createUsers.fail(`Failed to create users`);
    console.error(e);
    process.exit(1);
  }

  console.log(`Created ${numCreated} user(s)`);
};

export const updateUser = async (id: string, stage: string, user: User) => {
  const userData = {
    user_metadata: {
      ...user.user_metadata,
      locale: stage,
    },
  };

  await callAuth0Cli([
    "api",
    "patch",
    `'users/${id}'`,
    "--data",
    `'${JSON.stringify(userData)}'`,
  ]);
};

export const triggerEvents = async (stage: StageType) => {
  let usersUpdated = 0;
  // Update existing users
  const updateUsers = ora({
    text: `Update Users`,
  }).start();
  try {
    for (const user of users[stage]) {
      if (user.user_metadata.locale !== stage) {
        await updateUser(user.user_id, stage, user);
        user.user_metadata.locale = stage;
        ++usersUpdated;
      }
    }
    updateUsers.succeed();
  } catch (e) {
    updateUsers.fail(`Failed to update users`);
    console.error(e);
    process.exit(1);
  }

  let usersCreated = 0;
  // Create new users
  const createUsers = ora({
    text: `Create Users`,
  }).start();
  try {
    for (let i = 0; i < numberOfUsers; ++i) {
      await createUser(stage, stage);
      ++usersCreated;
    }
    createUsers.succeed();
  } catch (e) {
    updateUsers.fail(`Failed to create users`);
    console.error(e);
    process.exit(1);
  }

  console.log(
    `Created ${usersCreated} user(s), Updated ${usersUpdated} users for stage ${stage}`
  );
};

export const triggerEventsStage1 = async () => triggerEvents("stage1");

export const triggerEventsStage2 = async () => triggerEvents("stage2");

export const triggerEventsStage3 = async () => triggerEvents("stage3");

export const triggerDeletes = async () => {
  // Delete the first user in each stage
  for (const stage in users) {
    const user = users[stage][0];
    await callAuth0Cli(["users", "delete", `"${user.user_id}"`]);
    userIdsDeleted.push(user.user_id);
  }

  console.log(`Deleted ${userIdsDeleted.length} user(s)`);
};
