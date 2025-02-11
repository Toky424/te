"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.createUser = exports.getUser = exports.diffUser = void 0;
const api_client_1 = require("@hubspot/api-client");
const contacts_1 = require("@hubspot/api-client/lib/codegen/crm/contacts");
const checkValue = (name, a, b) => {
    if (a !== b) {
        console.log(`${name} is not equal: hubspot(${a}), event(${b})`);
    }
};
const diffUser = (user, userEvent) => {
    checkValue("email", user.email, userEvent.data.object.email);
    checkValue("Auth0 ID", user.auth0_id, userEvent.data.object.user_id);
    checkValue("locale", user.auth0_locale, userEvent.data.object.user_metadata?.locale);
};
exports.diffUser = diffUser;
let _hubspotClient = null;
const getHubspotClient = () => {
    if (!_hubspotClient) {
        _hubspotClient = new api_client_1.Client({
            accessToken: process.env.HUBSPOT_TOKEN,
        });
    }
    return _hubspotClient;
};
const getUser = async (userEvent) => {
    const hubspotClient = getHubspotClient();
    const searchByAuth0Ids = {
        filterGroups: [
            {
                filters: [
                    {
                        propertyName: "auth0_id",
                        operator: contacts_1.FilterOperatorEnum.Eq,
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
    const response = await hubspotClient.crm.contacts.searchApi.doSearch(searchByAuth0Ids);
    if (response.total === 0) {
        // user doesn't exist yet, return null
        return null;
    }
    if (response.total > 1) {
        console.warn("Got more than one user for user_id: ", userEvent.data.object.user_id);
    }
    const user = response.results[0];
    return {
        id: user.id,
        ...user.properties,
    };
};
exports.getUser = getUser;
const createUser = async (userEvent) => {
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
exports.createUser = createUser;
const updateUser = async (user, userEvent) => {
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
exports.updateUser = updateUser;
const deleteUser = async (user) => {
    const hubspotClient = getHubspotClient();
    await hubspotClient.crm.contacts.basicApi.archive(user.id);
    // will throw an exception if it fails
    console.log("Done deleting");
};
exports.deleteUser = deleteUser;
//# sourceMappingURL=hubspot.js.map