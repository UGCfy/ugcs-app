import { useLoaderData, useActionData, Form, redirect } from "react-router";
import { authenticate } from "../../shopify.server";
import prisma from "../../db.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  const mediaList = await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
  });

  return { mediaList };
};

export const action = async ({ request }) => {
  await authenticate.admin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  // Handle approve/reject intents
  if (intent === "approve" || intent === "reject") {
    const mediaId = formData.get("mediaId");
    
    await prisma.media.update({
      where: { id: mediaId },
      data: {
        status: intent === "approve" ? "APPROVED" : "REJECTED",
      },
    });

    return redirect("/app/media");
  }

  // Handle tag product intent
  if (intent === "tagProduct") {
    const mediaId = formData.get("mediaId");
    const productId = formData.get("productId");

    await prisma.media.update({
      where: { id: mediaId },
      data: {
        productId: productId && productId.trim() !== "" ? productId.trim() : null,
      },
    });

    return redirect("/app/media");
  }

  // Handle create intent (default)
  const url = formData.get("url");
  const caption = formData.get("caption");
  const status = formData.get("status");

  // Validate URL is non-empty
  if (!url || url.trim() === "") {
    return { error: "URL is required" };
  }

  // Create new media record
  await prisma.media.create({
    data: {
      url: url.trim(),
      caption: caption && caption.trim() !== "" ? caption.trim() : null,
      status: status || "DRAFT",
      sourceType: "UPLOAD",
      tags: [],
    },
  });

  return redirect("/app/media");
};

export default function MediaRoute() {
  const { mediaList } = useLoaderData();
  const actionData = useActionData();

  const getBadgeStyle = (status) => {
    const baseStyle = {
      display: "inline-block",
      padding: "0.25rem 0.5rem",
      borderRadius: "4px",
      fontSize: "0.875rem",
      fontWeight: "500",
    };

    switch (status) {
      case "APPROVED":
        return { ...baseStyle, backgroundColor: "#d4edda", color: "#155724" };
      case "REJECTED":
        return { ...baseStyle, backgroundColor: "#f8d7da", color: "#721c24" };
      case "DRAFT":
      default:
        return { ...baseStyle, backgroundColor: "#fff3cd", color: "#856404" };
    }
  };

  return (
    <s-page heading="UGC Media">
      <s-section heading="Add New Media">
        <Form method="post">
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="media-url"
              style={{ display: "block", marginBottom: "0.5rem" }}
            >
              <strong>URL *</strong>
            </label>
            <input
              id="media-url"
              type="text"
              name="url"
              placeholder="https://example.com/image.jpg"
              style={{
                width: "100%",
                padding: "0.5rem",
                border: actionData?.error
                  ? "1px solid #d32f2f"
                  : "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
            {actionData?.error && (
              <div style={{ color: "#d32f2f", marginTop: "0.5rem" }}>
                {actionData.error}
              </div>
            )}
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="media-caption"
              style={{ display: "block", marginBottom: "0.5rem" }}
            >
              <strong>Caption</strong>
            </label>
            <input
              id="media-caption"
              type="text"
              name="caption"
              placeholder="Optional caption"
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="media-status"
              style={{ display: "block", marginBottom: "0.5rem" }}
            >
              <strong>Status</strong>
            </label>
            <select
              id="media-status"
              name="status"
              defaultValue="DRAFT"
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#008060",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Save
          </button>
        </Form>
      </s-section>

      <s-section heading="Media Library">
        {mediaList.length === 0 ? (
          <s-paragraph>
            No media found. Start by uploading your first UGC content.
          </s-paragraph>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "1rem",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid #ddd" }}>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      width: "80px",
                    }}
                  >
                    Thumbnail
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left" }}>
                    Caption
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left" }}>
                    Status
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left" }}>
                    Product
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left" }}>
                    Created
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {mediaList.map((media) => (
                  <tr
                    key={media.id}
                    style={{ borderBottom: "1px solid #ddd" }}
                  >
                    <td style={{ padding: "0.75rem" }}>
                      <div
                        style={{
                          width: "60px",
                          height: "60px",
                          backgroundImage: `url(${media.url})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                        }}
                        title={media.url}
                      />
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {media.caption || "—"}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <span style={getBadgeStyle(media.status)}>
                        {media.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <Form
                        method="post"
                        style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
                      >
                        <input type="hidden" name="mediaId" value={media.id} />
                        <input type="hidden" name="intent" value="tagProduct" />
                        <input
                          type="text"
                          name="productId"
                          defaultValue={media.productId || ""}
                          placeholder="Product ID"
                          style={{
                            padding: "0.25rem 0.5rem",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            fontSize: "0.875rem",
                            width: "120px",
                          }}
                        />
                        <button
                          type="submit"
                          style={{
                            padding: "0.25rem 0.5rem",
                            backgroundColor: "#008060",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Set
                        </button>
                      </Form>
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {new Date(media.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        {media.status !== "APPROVED" && (
                          <Form method="post" style={{ display: "inline" }}>
                            <input type="hidden" name="mediaId" value={media.id} />
                            <input type="hidden" name="intent" value="approve" />
                            <button
                              type="submit"
                              style={{
                                padding: "0.25rem 0.5rem",
                                backgroundColor: "#28a745",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                              }}
                            >
                              Approve
                            </button>
                          </Form>
                        )}
                        {media.status !== "REJECTED" && (
                          <Form method="post" style={{ display: "inline" }}>
                            <input type="hidden" name="mediaId" value={media.id} />
                            <input type="hidden" name="intent" value="reject" />
                            <button
                              type="submit"
                              style={{
                                padding: "0.25rem 0.5rem",
                                backgroundColor: "#dc3545",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                              }}
                            >
                              Reject
                            </button>
                          </Form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </s-section>
    </s-page>
  );
}

