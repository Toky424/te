import { Client } from "@hubspot/api-client";
import {
  FilterOperatorEnum,
  PublicObjectSearchRequest,
  SimplePublicObjectId,
} from "@hubspot/api-client/lib/codegen/crm/contacts";

export interface UserEvent {
  id?: string;
  source?: string;
  specversion?: string;
  type: "user.updated" | "user.initialized" | "user.deleted" | "user.created";
  time: string;
  data: {
    object: {
      created_at?: string;
      email?: string;
      email_verified?: boolean;
      identities?: any[];
      name?: string;
      nickname?: "mostekcm_test_hubspot_before_processevents_1";
      picture?: string;
      updated_at?: string;
      user_id: string;
      user_metadata?: {
        locale?: string;
        [key: string]: any;
      };
    };
  };
}

interface User {
  id: string;
  email: string;
  auth0_id: string;
  notes_last_updated: string;
  auth0_locale?: string;
  auth0_last_event_timestamp?: string;
}

const checkValue = (name: string, a: string, b: string) => {
  if (a !== b) {
    console.log(`${name} is not equal: hubspot(${a}), event(${b})`);
  }
};

export const diffUser = (user: User, userEvent: UserEvent) => {
  checkValue("email", user.email, userEvent.data.object.email);
  checkValue("Auth0 ID", user.auth0_id, userEvent.data.object.user_id);
  checkValue(
    "locale",
    user.auth0_locale,
    userEvent.data.object.user_metadata?.locale
  );
};

let _hubspotClient: Client = null;

const getHubspotClient = () => {
  if (!_hubspotClient) {
    _hubspotClient = new Client({
      accessToken: process.env.HUBSPOT_TOKEN,
    });
  }

  return _hubspotClient;
};

export const getUser = async (userEvent: UserEvent): Promise<User | null> => {
  const hubspotClient = getHubspotClient();
  const searchByAuth0Ids: PublicObjectSearchRequest = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: "auth0_id",
            operator: FilterOperatorEnum.Eq,
            value: userEvent.data.object.user_id,
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

  const response = await hubspotClient.crm.contacts.searchApi.doSearch(
    searchByAuth0Ids
  );

  if (response.total === 0) {
    // user doesn't exist yet, return null
    return null;
  }

  if (response.total > 1) {
    console.warn(
      "Got more than one user for user_id: ",
      userEvent.data.object.user_id
    );
  }

  const user = response.results[0];
  return {
    id: user.id,
    ...user.properties,
  } as User;
};

export const createUser = async (userEvent: UserEvent) => {
  const hubspotClient = getHubspotClient();
  const lastEventTimestamp = new Date(userEvent.time).getTime().toString();
  const contactObj = {
    properties: {
      email: userEvent.data.object.email,
      auth0_id: userEvent.data.object.user_id,
      auth0_locale: userEvent.data.object.user_metadata.locale,
      auth0_last_event_timestamp: lastEventTimestamp,
    },
  };

  await hubspotClient.crm.contacts.basicApi.create(contactObj);
  // will throw an exception if it fails
  console.log("Done creating");
};

export const updateUser = async (user: User, userEvent: UserEvent) => {
  const hubspotClient = getHubspotClient();

  // check for actual updates here instead of just blindly sending all properties
  const properties = {
    ...(user.email !== userEvent.data.object.email
      ? { email: userEvent.data.object.email }
      : {}),
    ...(user.auth0_last_event_timestamp !==
    new Date(userEvent.time).getTime().toString()
      ? {
          auth0_last_event_timestamp: new Date(userEvent.time)
            .getTime()
            .toString(),
        }
      : {}),
    ...(user.auth0_locale !== userEvent.data.object.user_metadata.locale
      ? { auth0_locale: userEvent.data.object.user_metadata.locale }
      : {}),
  };

  await hubspotClient.crm.contacts.basicApi.update(user.id, { properties });
  // will throw an exception if it fails
  console.log("Done updating: ", Object.keys(properties).join(", "));
};

export const deleteUser = async (user: User) => {
  const hubspotClient = getHubspotClient();

  await hubspotClient.crm.contacts.basicApi.archive(user.id);
  // will throw an exception if it fails
  console.log("Done deleting");
};
