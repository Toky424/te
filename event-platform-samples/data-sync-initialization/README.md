# Hubspot Sync Event Stream Webhook

## Description

This test script is intended to provide some test events and synchronize those events with a demo hubspot tenant.
**WARNING**: Don't use this against a production hubspot implementation as it deletes and creates test users.
**WARNING**: Don't use this against a production Auth0 tenant as it deletes and creates test users.

Contains:

- A setup script for creating the stream.
- A cleanup script for removing the stream.
- A script for creating some users and waiting for those users to be synced with hubspot
- A cleanup script for deleting the users that it sent to hubspot.

NOTE: this is intended to work with either the [data-sync-to-hubspot webhook](../data-sync-to-hubspot/README.md) or the [data-sync-to-hubspot-with-inngest webhook](../data-sync-to-hubspot-with-inngest/README.md)

## Setup

### Setup your webhook

- Follow the [data-sync-to-hubspot webhook](../data-sync-to-hubspot/README.md) or the [data-sync-to-hubspot-with-inngest webhook](../data-sync-to-hubspot-with-inngest/README.md) for setting up the webhook
  - NOTE: The inngest integration is much more inline with best practices and closer to what a production implementation would look like

### Initialize the Auth0 CLI

- Ensure tenant has event_streams enabled
- [Install the Auth0 CLI](https://github.com/auth0/auth0-cli?tab=readme-ov-file#installation)
- Run: `auth0 login --scopes "read:event_streams,create:event_streams,update:event_streams,delete:event_streams,read:event_deliveries,update:event_deliveries,read:users,create:users,delete:users,update:users"`
  - Make sure you select the tenant you setup for test purposes
  - Run `auth0 tenants` to see which tenants you are connected to, make sure that the one you want to operate on is the selected tenant

### Configure this application

- `npm i`
- Copy the env.sample to .env
  - Set the `API_TOKEN` to the same value as your Vercel integration where you installed the webhook (it must be the same!)
  - Set the `HUBSPOT_TOKEN` to the accessToken from the private app you created in hubspot when you setup the webhook
  - Set the `WEBHOOK_URL` to the domain for the Vercel project you created with `data-sync-to-hubspot` or the inngest URL from `data-sync-to-hubspot-with-inngest`
  - Copy the `USER_PREFIX` to something that we can look for to ensure we delete all users that match that description
  - Copy the `CONNECTION_ID` from the Auth0 database (in Authentication->Database) for the tenant (NOTE: that database must be enabled for at least one application). This is the database that we will create users in.
  - Set the `EVENT_STREAM_NAME` to something you will remember what it is for (e.g. mostekcm-event-stream-for-hubspot)

## Create your Event Stream

- NOTE: If using the the [data-sync-to-hubspot webhook](../data-sync-to-hubspot/README.md) or the [data-sync-to-hubspot-with-inngest webhook](../data-sync-to-hubspot-with-inngest/README.md) for your webhook, you will want to set the IGNORE_DATE to the current time in their environment before creating and enabling the event stream
- To create & enable the stream: `npm run createStream`

## Run the application

- `npm run createUserEvents`
- This will generate a bunch of events and will check hubspot to make sure that the users all land appropriately

## Cleanup

- Before running a second time, you can run `npm run cleanupUsers` to clear out users from your tenant and hubspot. WARNING: THIS WILL DELETE ALL CONTACTS FROM HUBSPOT, so make sure you are using a test version.
- If you need to delete and recreate your event stream, run `npm run cleanupStream`

## TODO

[] Add organizations events to create orgs and associate members
