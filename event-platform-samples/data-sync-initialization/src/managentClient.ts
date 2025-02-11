import { ManagementClient } from "auth0";

let managementClient: ManagementClient = null;

export const getManagementClient = () => {
  if (!managementClient) {
    managementClient = new ManagementClient({
      domain: process.env.DOMAIN,
      clientId: process.env.MGMT_CLIENT_ID,
      clientSecret: process.env.MGMT_CLIENT_SECRET,
    });
  }

  return managementClient;
};
