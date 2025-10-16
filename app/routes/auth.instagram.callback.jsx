// app/routes/auth.instagram.callback.jsx
// Instagram Graph API OAuth callback handler
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    console.error("Instagram OAuth error:", error);
    return redirect("/app/channels?error=" + error);
  }

  if (!code) {
    return redirect("/app/channels?error=no_code");
  }

  try {
    // eslint-disable-next-line no-undef
    const appId = process.env.INSTAGRAM_APP_ID;
    // eslint-disable-next-line no-undef
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    const redirectUri = `${new URL(request.url).origin}/auth/instagram/callback`;

    // Step 1: Exchange code for short-lived access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    );
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message || "Failed to get access token");
    }

    const shortLivedToken = tokenData.access_token;

    // Step 2: Exchange for long-lived token (60 days)
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
    );
    const longLivedData = await longLivedResponse.json();
    
    if (longLivedData.error) {
      throw new Error(longLivedData.error.message || "Failed to get long-lived token");
    }

    const accessToken = longLivedData.access_token;

    // Step 3: Get user's Facebook Pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    );
    const pagesData = await pagesResponse.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error("No Facebook Pages found. Please create a Facebook Page and connect it to your Instagram Business account.");
    }

    // Step 4: Find Instagram Business Account connected to any page
    let instagramAccount = null;
    let pageAccessToken = null;

    for (const page of pagesData.data) {
      const igResponse = await fetch(
        `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
      );
      const igData = await igResponse.json();

      if (igData.instagram_business_account) {
        instagramAccount = igData.instagram_business_account;
        pageAccessToken = page.access_token;
        break;
      }
    }

    if (!instagramAccount) {
      throw new Error("No Instagram Business Account found. Please connect your Instagram Business account to a Facebook Page.");
    }

    // Step 5: Get Instagram account details
    const igAccountResponse = await fetch(
      `https://graph.facebook.com/v18.0/${instagramAccount.id}?fields=id,username,profile_picture_url&access_token=${pageAccessToken}`
    );
    const igAccountData = await igAccountResponse.json();

    if (igAccountData.error) {
      throw new Error(igAccountData.error.message || "Failed to get Instagram account details");
    }

    // Step 6: Save to database
    await prisma.channel.create({
      data: {
        name: `Instagram - @${igAccountData.username}`,
        type: "INSTAGRAM",
        status: "CONNECTED",
        username: igAccountData.username,
        accessToken: pageAccessToken, // Use page access token for Instagram API
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        metadata: JSON.stringify({
          instagramAccountId: igAccountData.id,
          profilePicture: igAccountData.profile_picture_url,
        }),
      },
    });

    return redirect("/app/channels?success=instagram_connected");
  } catch (error) {
    console.error("Instagram connection failed:", error);
    return redirect("/app/channels?error=" + encodeURIComponent(error.message));
  }
};

// Component shown during redirect (closes popup if in popup)
export default function InstagramCallback() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Connecting Instagram...</h2>
      <p>Please wait while we complete the connection.</p>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // If we're in a popup, close it
            if (window.opener) {
              window.close();
            }
          `,
        }}
      />
    </div>
  );
}
