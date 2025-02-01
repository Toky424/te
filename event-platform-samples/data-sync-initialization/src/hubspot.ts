import { Client } from "@hubspot/api-client";
import { users as originalUserMap, userIdsDeleted } from "./loadTestData";
import {
  FilterOperatorEnum,
  PublicObjectSearchRequest,
  SimplePublicObjectId,
} from "@hubspot/api-client/lib/codegen/crm/contacts";

let _hubspotClient: Client = null;

const getHubspotClient = () => {
  if (!_hubspotClient) {
    _hubspotClient = new Client({
      accessToken: process.env.HUBSPOT_TOKEN,
    });
  }

  return _hubspotClient;
};

let timeoutId: ReturnType<typeof setTimeout> = null;
let finishWaiting: (value: void) => void = null;
let finishChecking = () => {
  if (timeoutId) clearTimeout(timeoutId);
  finishWaiting();
};
let failWaiting: (error?: any) => void = null;
let failChecking = (error?: any) => {
  if (timeoutId) clearTimeout(timeoutId);
  failWaiting(error);
};
let remainingUserIds: string[] = null;

const checkUsers = async () => {
  if (remainingUserIds === null) {
    failChecking(
      Error("Shouldn't be called before initializing the remainingUserIds")
    );
  }

  if (remainingUserIds.length === 0) {
    finishChecking();
  }

  console.log("Searching for these users: ", remainingUserIds);

  const hubspotClient = getHubspotClient();
  const searchByAuth0Ids: PublicObjectSearchRequest = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: "auth0_id",
            operator: FilterOperatorEnum.In,
            values: remainingUserIds,
          },
        ],
      },
    ],
    properties: [
      "email",
      "auth0_id",
      "notes_last_updated",
      "auth0_locale",
      "auth0_last_event_timestamp",
    ],
    after: "0",
  };
  try {
    const response = await hubspotClient.crm.contacts.searchApi.doSearch(
      searchByAuth0Ids
    );

    for (const user of response.results) {
      // Example email: mostekcm_test_hubspot_before_processevents_3@example.com
      const matches = user.properties.email?.match(
        /^mostekcm_test_hubspot_\d+_(.+)_\d*@example\.com$/
      );
      if (matches) {
        const stage = matches[1];
        if (stage === user.properties.auth0_locale) {
          remainingUserIds = remainingUserIds.filter(
            (e) => e !== user.properties.auth0_id
          );
        } else {
          console.log(
            `User (${user.properties.email}) has not had the locale updated to ${stage}, it is still ${user.properties.auth0_locale}`
          );
        }
      } else {
        console.log("Ignoring user: ", user.properties);
      }
    }
  } catch (e) {
    failChecking(e);
  }

  if (remainingUserIds.length === 0) {
    console.log("Done waiting");
    finishChecking();
  } else {
    console.log(
      `Still have ${remainingUserIds.length} user(s) to process, waiting 5 seconds...`
    );
    setTimeout(checkUsers, 5000);
  }
};

export const waitForUsersToMatch = async () =>
  new Promise((resolve, reject) => {
    finishWaiting = resolve;
    failWaiting = reject;
    timeoutId = setTimeout(
      () => reject(new Error("Timed out waiting for users to sync")),
      600000
    );

    remainingUserIds = [];
    for (const stage in originalUserMap) {
      for (const user of originalUserMap[stage]) {
        remainingUserIds.push(user.user_id);
      }
    }

    checkUsers();
  });

const checkDeletedUsers = async () => {
  if (remainingUserIds === null) {
    failChecking(
      Error("Shouldn't be called before initializing the remainingUserIds")
    );
  }

  if (remainingUserIds.length === 0) {
    finishChecking();
  }

  console.log("Searching for these users: ", remainingUserIds);

  const hubspotClient = getHubspotClient();
  const searchByAuth0Ids: PublicObjectSearchRequest = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: "auth0_id",
            operator: FilterOperatorEnum.In,
            values: remainingUserIds,
          },
        ],
      },
    ],
    properties: [
      "email",
      "auth0_id",
      "notes_last_updated",
      "auth0_locale",
      "auth0_last_event_timestamp",
    ],
    after: "0",
  };
  try {
    const response = await hubspotClient.crm.contacts.searchApi.doSearch(
      searchByAuth0Ids
    );

    const foundUsers: string[] = [];
    for (const user of response.results) {
      foundUsers.push(user.properties.auth0_id);
    }

    remainingUserIds = remainingUserIds.filter((user_id) =>
      foundUsers.includes(user_id)
    );
  } catch (e) {
    failChecking(e);
  }

  if (remainingUserIds.length === 0) {
    console.log("Done waiting");
    finishChecking();
  } else {
    console.log(
      `Still have ${remainingUserIds.length} user(s) to process, waiting 5 seconds...`
    );
    setTimeout(checkDeletedUsers, 5000);
  }
};

export const waitForUsersToBeDeleted = async () =>
  new Promise((resolve, reject) => {
    finishWaiting = resolve;
    failWaiting = reject;
    timeoutId = setTimeout(
      () => reject(new Error("Timed out waiting for users to sync")),
      600000
    );

    remainingUserIds = [...userIdsDeleted];

    checkDeletedUsers();
  });

export const deleteExistingHubspotUsers = async () => {
  const hubspot = getHubspotClient();

  const response = await hubspot.crm.contacts.getAll();

  const idsToDelete: SimplePublicObjectId[] = [];
  for (const user of response) {
    idsToDelete.push({
      id: user.id,
    });
  }

  hubspot.crm.contacts.batchApi.archive({ inputs: idsToDelete });

  console.log(`Deleted ${idsToDelete.length} user(s) from hubspot`);
};
