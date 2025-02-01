import { AuthenticationClient } from "auth0";
import { users as originalUsers, users } from "./loadTestData";

let token: string = null;
let streamId: string = null;

const getAudience = () => {
  const domain = process.env.DOMAIN;
  return `https://${domain}/api/v2/`;
};

const getToken = async () => {
  if (!token) {
    const domain = process.env.DOMAIN;
    const audience = getAudience();

    const auth0 = new AuthenticationClient({
      domain,
      clientId: process.env.MGMT_CLIENT_ID,
      clientSecret: process.env.MGMT_CLIENT_SECRET,
    });

    const response = await auth0.oauth.clientCredentialsGrant({ audience });

    token = response.data.access_token;
  }

  return token;
};

export const request = async (
  method: "POST" | "PATCH" | "PUT" | "GET" | "DELETE",
  options?: {
    extraPath?: string;
    query?: { [key: string]: string };
    body?: any;
  }
) => {
  const searchParams = options?.query
    ? `?${new URLSearchParams(options.query).toString()}`
    : "";
  const url = `${getAudience()}event-streams${
    options?.extraPath ? `/${options.extraPath}` : ""
  }${searchParams}`;
  const authorization = `Bearer ${await getToken()}`;
  const fetchOptions: RequestInit = {
    method,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    headers: {
      authorization,
      "Content-type": "application/json; charset=UTF-8",
    },
  };
  const response = await fetch(url, fetchOptions);

  const json = response.status === 204 ? {} : await response.json();

  if (!response.ok) {
    throw Error(
      `Bad response ${method} ${
        response.status
      } from call to ${url}, body: ${JSON.stringify(
        options?.body ? options.body : {}
      )}, body: ${JSON.stringify(json)}`
    );
  }

  return json;
};
const post = async (body: any, extraPath?: string) =>
  request("POST", { extraPath, body });
const patch = async (id: string, body: any) =>
  request("PATCH", { extraPath: id, body });
const get = async (extraPath?: string, query?: { [key: string]: string }) =>
  request("GET", { extraPath, query });
const deleteItem = async (id: string) => request("DELETE", { extraPath: id });

export const deleteEventStream = async () => {
  // retrieve the streams
  const streams = await get();

  // find the stream that matches the
  for (const stream of streams.eventStreams) {
    if (stream.name === process.env.EVENT_STREAM_NAME) {
      // found it! Delete this stream
      console.log(`Deleting stream ${stream.name} (${stream.id}) ...`);
      await deleteItem(`${stream.id}`);
      console.log(`Deleted`);
      return true;
    }
  }

  console.log(`${process.env.EVENT_STREAM_NAME} does not exist`);
  return false;
};

export const createEventStream = async () => {
  const stream = await post({
    name: process.env.EVENT_STREAM_NAME,
    subscriptions: [
      {
        event_type: "user.created",
      },
      {
        event_type: "user.updated",
      },
      {
        event_type: "user.deleted",
      },
    ],
    destination: {
      type: "webhook",
      configuration: {
        webhook_endpoint: process.env.USE_INNGEST
          ? process.env.INNGEST_URL
          : process.env.ACTUAL_WEBHOOK_URL,
        webhook_authorization: {
          method: "bearer",
          token: process.env.API_TOKEN,
        },
      },
    },
  });

  streamId = stream.id;
  console.log("Event Stream Created");
};

export const enableStream = async () => {
  await patch(streamId, {
    status: "enabled",
  });
};

export const disableStream = async () => {
  await patch(streamId, {
    status: "disabled",
  });
};

export const resendEvents = async () => {
  await post({}, `${streamId}/redeliver`);
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

const checkEvents = async (
  numberOfEvents: number,
  emailAddresses: string[],
  startTime: string
) => {
  if (numberOfEvents === null) {
    return failChecking(
      Error("Shouldn't be called before initializing the remainingUserIds")
    );
  }

  if (numberOfEvents === 0) {
    return failChecking(Error("We shouldn't have 0 events to look for"));
  }

  console.log(`Searching for ${numberOfEvents} events`);

  try {
    const deliveries = await get(`${streamId}/deliveries`, {
      event_types: `user.created,user.updated`,
      date_from: startTime.substring(0, 19) + "Z",
    });
    const messages = [];
    const allDeliveries = deliveries?.deliveries || [];
    for (const delivery of allDeliveries) {
      if (
        delivery.event.time > startTime &&
        emailAddresses.includes(delivery.event.data.object.email)
      ) {
        console.log(`Found valid event: ${delivery.event.time} > ${startTime}`);
        messages.push(delivery);
      } else {
        console.log(
          `Found invalid event: ${delivery.event.time} > ${startTime}, ${delivery.event.data.object.email}`
        );
      }
    }

    if (messages.length === numberOfEvents) {
      console.log("Found all events in the DLQ");
      return finishChecking();
    }

    if (messages.length > numberOfEvents) {
      console.log("Too many events!");
      console.log(messages);
      return finishChecking();
    }

    console.log(`Still waiting for ${numberOfEvents - messages.length}`);
    return setTimeout(
      () => checkEvents(numberOfEvents, emailAddresses, startTime),
      5000
    );
  } catch (e) {
    return failChecking(e);
  }
};

export const waitForEventsToLandInTheDlq = async (startTime: string) =>
  new Promise((resolve, reject) => {
    finishWaiting = resolve;
    failWaiting = reject;
    timeoutId = setTimeout(
      () =>
        reject(new Error("Timed out waiting for events to land in the DLQ")),
      600000
    );

    const numberOfEvents =
      originalUsers["while_broken"].length +
      originalUsers["while_broken"].length / 2;

    const emailAddresses = users["while_broken"].map((user) => user.email);
    checkEvents(numberOfEvents, emailAddresses, startTime);
  });
