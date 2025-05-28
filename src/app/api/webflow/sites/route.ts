import { auth } from "../../auth/auth.config";
import { NextResponse } from "next/server";
import { WebflowClient } from "webflow-api";

export const config = { runtime: "edge" };

// Define interface based on actual API response
interface WebflowSite {
  id: string;
  name: string;
  [key: string]: unknown;
}

// Define the structure of the list response
interface SitesResponse {
  sites?: WebflowSite[];
  [key: string]: unknown;
}

export async function GET() {
  try {
    // Get session to check if user is authenticated and has Webflow token
    const session = await auth();

    if (!session || !session.webflowAccessToken) {
      return NextResponse.json(
        {
          error: "Unauthorized. Please connect your Webflow account first.",
        },
        { status: 401 }
      );
    }

    // Create a Webflow client with the user's access token
    const webflow = new WebflowClient({
      accessToken: session.webflowAccessToken as string,
    });

    // Fetch the user's sites using the webflow.sites.list() method
    const sitesResponse = (await webflow.sites.list()) as SitesResponse;

    // Initialize sites array
    let sites: WebflowSite[] = [];

    // Handle the response based on SDK types
    if (sitesResponse.sites && Array.isArray(sitesResponse.sites)) {
      sites = sitesResponse.sites;
    } else if (Array.isArray(sitesResponse)) {
      sites = sitesResponse as unknown as WebflowSite[];
    } else if (
      sitesResponse &&
      typeof sitesResponse === "object" &&
      "id" in sitesResponse &&
      "name" in sitesResponse
    ) {
      // Handle single site response
      sites = [sitesResponse as unknown as WebflowSite];
    }

    return NextResponse.json({
      sites,
      count: sites.length,
    });
  } catch (error) {
    console.error("Error fetching Webflow sites:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch Webflow sites",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
