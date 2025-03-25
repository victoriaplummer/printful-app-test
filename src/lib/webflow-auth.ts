import { WebflowClient } from "webflow-api";

const checkEnvVariables = () => {
  if (
    !process.env.WEBFLOW_CLIENT_ID ||
    !process.env.WEBFLOW_CLIENT_SECRET ||
    !process.env.WEBFLOW_REDIRECT_URI
  ) {
    throw new Error("Missing Webflow environment variables");
  }
};

export const getWebflowAuthUrl = () => {
  checkEnvVariables();

  return WebflowClient.authorizeURL({
    state: "webflow-auth-state",
    scope: ["sites:read"],
    clientId: process.env.WEBFLOW_CLIENT_ID as string,
    redirectUri: process.env.WEBFLOW_REDIRECT_URI as string,
  });
};

export const getWebflowAccessToken = async (code: string) => {
  checkEnvVariables();

  try {
    const accessToken = await WebflowClient.getAccessToken({
      clientId: process.env.WEBFLOW_CLIENT_ID as string,
      clientSecret: process.env.WEBFLOW_CLIENT_SECRET as string,
      code,
    });
    return accessToken;
  } catch (error) {
    console.error("Error getting Webflow access token:", error);
    throw error;
  }
};

export const createWebflowClient = (accessToken: string) => {
  return new WebflowClient({ accessToken });
};
