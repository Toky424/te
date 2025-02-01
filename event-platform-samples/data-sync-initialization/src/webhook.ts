export interface UserEvent {
  type: "user.initialized";
  time: string;
  data: {
    object: {
      user_id: string;
      email: string;
      phone?: string;
      updated_at: string;
      created_at: string;
      user_metadata: {
        locale: string;
      };
    };
  };
}

export const sendEvent = async (userEvent: UserEvent) => {
  const url = process.env.USE_INNGEST
    ? process.env.INNGEST_URL
    : process.env.TEST_WEBHOOK_URL;
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(userEvent),
    headers: {
      authorization: `Bearer ${process.env.API_TOKEN}`,
      "Content-type": "application/json; charset=UTF-8",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Harsh, but dying here on purpose because we got a response of ${
        response.status
      } from the webhook: ${url}: ${JSON.stringify(
        await response.json(),
        null,
        2
      )}`
    );
  }
};

const postWebhook = async (endpoint: "ignore" | "break" | "fix") => {
  const url = process.env.USE_INNGEST
    ? process.env.IGNORE_URL
    : `${process.env.TEST_WEBHOOK_URL}/${endpoint}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.API_TOKEN}`,
      "Content-type": "application/json; charset=UTF-8",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Harsh, but dying here on purpose because we got a response of ${
        response.status
      } from the webhook: ${url}: ${JSON.stringify(
        await response.json(),
        null,
        2
      )}`
    );
  }
};

export const ignoreEventsBeforeNow = async () => await postWebhook("ignore");
export const breakEventStreamProcessing = async () =>
  await postWebhook("break");
export const fixEventStreamProcessing = async () => await postWebhook("fix");
