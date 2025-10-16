// app/routes/app.channels/route.jsx
import { useLoaderData, useActionData, Form, redirect } from "react-router";
import { authenticate } from "../../shopify.server.js";
import prisma from "../../db.server.js";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  // Fetch connected channels
  const channels = await prisma.channel.findMany({
    orderBy: { createdAt: "desc" },
  });

  return { channels };
};

export const action = async ({ request }) => {
  await authenticate.admin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  // Connect Instagram - redirect to OAuth
  if (intent === "connectInstagram") {
    // eslint-disable-next-line no-undef
    const instagramAppId = process.env.INSTAGRAM_APP_ID;
    
    if (!instagramAppId) {
      return {
        error: "Instagram App ID not configured. Please add INSTAGRAM_APP_ID to your .env file.",
      };
    }

    // eslint-disable-next-line no-undef
    const redirectUri = `${process.env.SHOPIFY_APP_URL}/auth/instagram/callback`;
    const oauthUrl = `https://api.instagram.com/oauth/authorize?client_id=${instagramAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user_profile,user_media&response_type=code`;

    return redirect(oauthUrl);
  }

  // Disconnect channel
  if (intent === "disconnect") {
    const channelId = formData.get("channelId");
    await prisma.channel.delete({ where: { id: channelId } });
    return { success: "Channel disconnected successfully" };
  }

  // Test import
  if (intent === "testImport") {
    const channelId = formData.get("channelId");
    
    try {
      // eslint-disable-next-line no-undef
      const response = await fetch(`${process.env.SHOPIFY_APP_URL}/api/import-instagram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          limit: 10,
        }),
      });

      const result = await response.json();
      
      if (result.error) {
        return { error: `Import failed: ${result.error}` };
      }

      return { success: `Successfully imported ${result.imported || 0} posts!` };
    } catch (err) {
      return { error: `Import failed: ${err.message}` };
    }
  }

  return { error: "Unknown action" };
};

export default function ChannelsPage() {
  const { channels } = useLoaderData();
  const actionData = useActionData();

  // Check if Instagram is already connected
  const instagramChannel = channels?.find((c) => c.type === "INSTAGRAM");

  const handleInstagramConnect = async (e) => {
    e.preventDefault();
    
    try {
      // Get OAuth URL from server (includes App ID securely)
      const response = await fetch('/api/instagram-oauth-url', {
        credentials: 'include',
      });
      const data = await response.json();

      console.log("Instragram api", data)

      if (data.error) {
        alert(`Error: ${data.error}. Please configure INSTAGRAM_APP_ID in your .env file.`);
        return;
      }
      
      // Open in popup window to avoid Shopify iframe restrictions
      const popup = window.open(
        data.oauthUrl,
        'instagram_oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        alert('Popup blocked! Please allow popups for this site and try again.');
        return;
      }

      // Listen for popup close (user completed or cancelled OAuth)
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          // Refresh the page to show the connected channel
          window.location.reload();
        }
      }, 500);
    } catch (error) {
      alert(`Connection failed: ${error.message}`);
    }
  };

  return (
    <s-page heading="Content Channels">
      <s-section>
        <s-paragraph>
          Connect your social media accounts to automatically import UGC content from your customers and brand advocates.
        </s-paragraph>
      </s-section>

      {actionData?.error && (
        <s-section variant="critical">
          <s-paragraph>{actionData.error}</s-paragraph>
        </s-section>
      )}

      {actionData?.success && (
        <s-section variant="success">
          <s-paragraph>{actionData.success}</s-paragraph>
        </s-section>
      )}

      {/* Instagram Card */}
      <s-section>
        <div
          style={{
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "24px",
                  fontWeight: "bold",
                }}
              >
                📷
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Instagram</h3>
                <p style={{ margin: "0.25rem 0 0 0", color: "#666", fontSize: "0.9rem" }}>
                  Import posts, reels, and stories from your Instagram account
                </p>
              </div>
            </div>
            {instagramChannel && (
              <div
                style={{
                  background: "#d4edda",
                  color: "#155724",
                  padding: "0.5rem 1rem",
                  borderRadius: "4px",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                }}
              >
                ✓ Connected
              </div>
            )}
          </div>

          {!instagramChannel ? (
            <button
              onClick={handleInstagramConnect}
              style={{
                background: "#0066cc",
                color: "white",
                border: "none",
                padding: "0.75rem 2rem",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "500",
                marginTop: "1rem",
              }}
            >
              Connect Instagram
            </button>
          ) : (
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
              <div
                style={{
                  background: "#f9f9f9",
                  padding: "1rem",
                  borderRadius: "6px",
                  flex: 1,
                }}
              >
                <div style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.25rem" }}>
                  Account
                </div>
                <div style={{ fontWeight: "500" }}>@{instagramChannel.username || "Unknown"}</div>
              </div>
              <div
                style={{
                  background: "#f9f9f9",
                  padding: "1rem",
                  borderRadius: "6px",
                  flex: 1,
                }}
              >
                <div style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.25rem" }}>
                  Connected
                </div>
                <div style={{ fontWeight: "500" }}>
                  {new Date(instagramChannel.createdAt).toLocaleDateString()}
                </div>
              </div>
              <Form method="post" style={{ display: "flex", alignItems: "center" }}>
                <input type="hidden" name="intent" value="testImport" />
                <input type="hidden" name="channelId" value={instagramChannel.id} />
                <button
                  type="submit"
                  style={{
                    background: "#28a745",
                    color: "white",
                    border: "none",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: "500",
                    height: "fit-content",
                  }}
                >
                  Test Import
                </button>
              </Form>
              <Form method="post" style={{ display: "flex", alignItems: "center" }}>
                <input type="hidden" name="intent" value="disconnect" />
                <input type="hidden" name="channelId" value={instagramChannel.id} />
                <button
                  type="submit"
                  style={{
                    background: "#dc3545",
                    color: "white",
                    border: "none",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: "500",
                    height: "fit-content",
                  }}
                >
                  Disconnect
                </button>
              </Form>
            </div>
          )}
        </div>
      </s-section>

      {/* TikTok Card - Coming Soon */}
      <s-section>
        <div
          style={{
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
            opacity: 0.6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(45deg, #00f2ea, #ff0050)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              🎵
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>TikTok</h3>
              <p style={{ margin: "0.25rem 0 0 0", color: "#666", fontSize: "0.9rem" }}>
                Coming soon
              </p>
            </div>
          </div>
        </div>
      </s-section>

      {/* Email Submissions - Coming Soon */}
      <s-section>
        <div
          style={{
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            padding: "1.5rem",
            opacity: 0.6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#4285f4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              📧
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Email Submissions</h3>
              <p style={{ margin: "0.25rem 0 0 0", color: "#666", fontSize: "0.9rem" }}>
                Coming soon
              </p>
            </div>
          </div>
        </div>
      </s-section>
    </s-page>
  );
}
