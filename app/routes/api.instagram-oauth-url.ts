// app/routes/api.instagram-oauth-url.ts
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);

 
  const instagramAppId = process.env.INSTAGRAM_APP_ID;
  
  const appUrl = process.env.SHOPIFY_APP_URL || request.headers.get("origin") || "";

  if (!instagramAppId) {
    return Response.json(
      { error: "Instagram App ID not configured" },
      { status: 500 }
    );
  }

  const redirectUri = `${appUrl}/auth/instagram/callback`;
  
  // Instagram Graph API uses Facebook Login
  // Permissions needed: instagram_basic (read posts), pages_show_list (get pages), instagram_manage_insights (optional)
  const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${instagramAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,pages_show_list,instagram_manage_insights&response_type=code&state=instagram_connect`;

  return Response.json({ oauthUrl });
}

