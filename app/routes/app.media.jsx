import { redirect, Form, useLoaderData, useActionData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

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
  const url = formData.get("url");
  const caption = formData.get("caption");

  // Validate URL is non-empty
  if (!url || url.trim() === "") {
    return { error: "URL is required" };
  }

  // Create new media record
  await prisma.media.create({
    data: {
      url: url.trim(),
      caption: caption ? caption.trim() : null,
      sourceType: "UPLOAD",
      status: "DRAFT",
      tags: [],
    },
  });

  return redirect("/app/media");
};

export default function MediaPage() {
  const { mediaList } = useLoaderData();
  const actionData = useActionData();

  return (
    <s-page heading="Media Management">
      <s-section>
        <s-heading>Add New Media</s-heading>
        <Form method="post" style={{ marginTop: "1rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              <strong>URL *</strong>
            </label>
            <input
              type="text"
              name="url"
              placeholder="https://example.com/image.jpg"
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
            {actionData?.error && (
              <div style={{ color: "red", marginTop: "0.5rem" }}>
                {actionData.error}
              </div>
            )}
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              <strong>Caption</strong>
            </label>
            <input
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

          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#008060",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Add Media
          </button>
        </Form>
      </s-section>

      <s-section heading="Media Library">
        {mediaList.length === 0 ? (
          <s-paragraph>
            No media yet. Add your first media item using the form above.
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
                  <th style={{ padding: "0.75rem", textAlign: "left" }}>URL</th>
                  <th style={{ padding: "0.75rem", textAlign: "left" }}>
                    Caption
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left" }}>
                    Status
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left" }}>
                    Created At
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
                      <a
                        href={media.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#006fbb", textDecoration: "none" }}
                      >
                        {media.url.length > 50
                          ? `${media.url.substring(0, 50)}...`
                          : media.url}
                      </a>
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {media.caption || "-"}
                    </td>
                    <td style={{ padding: "0.75rem" }}>{media.status}</td>
                    <td style={{ padding: "0.75rem" }}>
                      {new Date(media.createdAt).toLocaleString()}
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

