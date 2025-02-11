# Hubspot Sync Event Stream Webhook

## Setup

### Configure Hubspot

- Create an account at hubspot.com
- Create a private app: Settings->Integrations->Private Apps
  - Create a private app
  - Set the scopes to:
    - crm.objects.contacts.write
    - crm.schemas.contacts.write
    - crm.objects.contacts.sensitive.read
    - crm.objects.contacts.sensitive.write
    - crm.schemas.contacts.read
    - crm.objects.contacts.read
- Add custom fields to Contacts: Settings->Properties
  - Select Contact properties
  - `Create Property`
    - Property label: `Auth0 ID`
    - Internal name: `auth0_id`
    - Group: `Contact Information`
    - Field Type: `Single-line text`
  - `Create Property`
    - Property label: `Auth0 Last Event Timestamp`
    - Internal name: `auth0_last_event_timestamp`
    - Group: `Contact Information`
    - Field Type: `Single-line text`
  - `Create Property`
    - Property label: `Auth0 Locale`
    - Internal name: `auth0_locale`
    - Group: `Contact Information`
    - Field Type: `Single-line text`

### Configure Vercel

- Create your own repo with the contents of this directory
- Create a new project from Vercel, choose the repo you just created
  - Build and Output Settings
    - Output Directory (override): `dist`
  - Environment Variables
    - **IGNORE_DATE**: Set this to the time at which you want to start processing events
    - **HUBSPOT_TOKEN**: Copy the accessToken from the Private App you created in hubspot
    - **API_TOKEN**: A random string that you will need for the initialization sync script, it must be the same in the environment and the settings for the event stream

## Initialization Script

You can exercise this webhook by manually creating events in the tenant, or you can use [this initialization script](../data-sync-initialization/README.md)to simulate how you would initialize this system.

## Test Locally

If you are struggling to get this working, you can run locally and use postman to send a couple of test events to make sure your integration with hubspot is working.

### Configure this application

- `npm i`
- Copy the `env.sample` to `.env`
  - **IGNORE_DATE**: Set this to the time at which you want to start processing events
  - **HUBSPOT_TOKEN**: Copy the accessToken from the Private App you created in hubspot
  - **API_TOKEN**: A random string that you will need for the initialization sync script, it must be the same in both places

## Run

- `npm run dev`

## TODO

[] Add organizations events to create companies and associate contacts with those companies