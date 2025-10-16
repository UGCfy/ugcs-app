import { useLoaderData, useActionData, Form, redirect, useSubmit } from "react-router";
import { useState } from "react";
import { authenticate } from "../../shopify.server";
import prisma from "../../db.server";
import ProductAttach from "../../components/ProductAttach";
import { canPerformAction, getUsageStats } from "../../lib/usage-limits";

export const loader = async ({ request }) => {
  // Temporarily comment out auth to avoid OAuth redirects during dev
  // Uncomment when ready to deploy:
  const { admin, session } = await authenticate.admin(request);

  // Parse filter params
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const tag = (url.searchParams.get("tag") || "").trim();
  const status = (url.searchParams.get("status") || "").trim();
  const attached = (url.searchParams.get("attached") || "").trim();

  // Build where clause
  const where = {
    AND: [
      q
        ? {
            OR: [
              { url: { contains: q, mode: "insensitive" } },
              { caption: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      status ? { status } : {},
      attached === "yes" ? { NOT: { productId: null } } : {},
      attached === "no" ? { productId: null } : {},
      tag
        ? {
            mediaTags: {
              some: { tag: { OR: [{ slug: tag }, { name: tag }] } },
            },
          }
        : {},
    ],
  };

  const media = await prisma.media.findMany({
    where,
    include: {
      mediaTags: {
        include: { tag: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Fetch tag options for filter dropdown
  const tagOptions = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    take: 100,
    select: { id: true, name: true, slug: true },
  });

  // Fetch product titles from Shopify
  const productIds = Array.from(
    new Set(media.map((m) => m.productId).filter(Boolean))
  );

  let productMap = {};
  if (productIds.length > 0) {
    try {
      const gql = `#graphql
        query Products($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              title
              featuredImage {
                url
              }
            }
          }
        }
      `;
      const resp = await admin.graphql(gql, { variables: { ids: productIds } });
      const json = await resp.json();

      for (const node of json.data?.nodes || []) {
        if (node && node.id) {
          productMap[node.id] = {
            title: node.title,
            image: node.featuredImage?.url,
          };
        }
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  }

  // Shape data to include tags and product info
  const mediaList = media.map((m) => ({
    id: m.id,
    url: m.url,
    caption: m.caption,
    productId: m.productId,
    product: m.productId ? productMap[m.productId] : null,
    status: m.status,
    createdAt: m.createdAt,
    tags: m.mediaTags.map((mt) => ({
      id: mt.tag.id,
      name: mt.tag.name,
      slug: mt.tag.slug,
    })),
  }));

  // Get usage stats for plan limits
  const usage = await getUsageStats(session.shop);
  const usageCheck = await canPerformAction(session.shop, "create_media", usage);

  return {
    mediaList,
    filters: { q, tag, status, attached },
    tagOptions,
    usage,
    usageCheck,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();
  const url = formData.get("url");
  const caption = formData.get("caption");
  const status = formData.get("status");

  // Validate URL is non-empty
  if (!url || url.trim() === "") {
    return { error: "URL is required" };
  }

  // Check usage limits before creating
  const usageCheck = await canPerformAction(session.shop, "create_media");
  
  if (!usageCheck.allowed) {
    return {
      error: `Limit reached! Your ${usageCheck.plan} plan allows ${usageCheck.limit} media items. You currently have ${usageCheck.current}. Please upgrade to add more.`,
      limitReached: true,
    };
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

/* eslint-disable react/prop-types */
function MediaRow({ media, getBadgeStyle, isSelected, onSelect }) {
  const [newTag, setNewTag] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleAddTag = async () => {
    const name = newTag.trim();
    if (!name) return;
    
    setIsAddingTag(true);
    try {
      // 1) Create/upsert tag
      const tagRes = await fetch("/api/tags", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const tag = await tagRes.json();

      // 2) Link tag to media
      await fetch("/api/media-tags", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: media.id, tagId: tag.id }),
      });

      setNewTag("");
      // Reload to show new tag
      window.location.reload();
    } catch (error) {
      console.error("Failed to add tag:", error);
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagId) => {
    try {
      await fetch("/api/media-tags", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: media.id, tagId }),
      });
      // Reload to reflect removal
      window.location.reload();
    } catch (error) {
      console.error("Failed to remove tag:", error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setIsUpdatingStatus(true);
    try {
      await fetch("/api/media-status", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: media.id, status: newStatus }),
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to update status:", error);
      setIsUpdatingStatus(false);
    }
  };

  return (
    <tr style={{ borderBottom: "1px solid #ddd", backgroundColor: isSelected ? "#f0f8ff" : "transparent" }}>
      {/* Checkbox */}
      <td style={{ padding: "0.75rem" }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(media.id)}
          style={{ cursor: "pointer" }}
        />
      </td>
      
      {/* Thumbnail */}
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

      {/* Caption */}
      <td style={{ padding: "0.75rem" }}>{media.caption || "—"}</td>

      {/* Status */}
      <td style={{ padding: "0.75rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {/* Status Badge */}
          <span style={getBadgeStyle(media.status)}>{media.status}</span>
          
          {/* Status Controls */}
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button
              onClick={() => handleStatusChange("DRAFT")}
              disabled={isUpdatingStatus || media.status === "DRAFT"}
              style={{
                padding: "0.25rem 0.5rem",
                backgroundColor: media.status === "DRAFT" ? "#666" : "#f0f0f0",
                color: media.status === "DRAFT" ? "white" : "#333",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: isUpdatingStatus || media.status === "DRAFT" ? "not-allowed" : "pointer",
                fontSize: "0.75rem",
                fontWeight: media.status === "DRAFT" ? "600" : "400",
              }}
            >
              Draft
            </button>
            <button
              onClick={() => handleStatusChange("APPROVED")}
              disabled={isUpdatingStatus || media.status === "APPROVED"}
              style={{
                padding: "0.25rem 0.5rem",
                backgroundColor: media.status === "APPROVED" ? "#28a745" : "#f0f0f0",
                color: media.status === "APPROVED" ? "white" : "#333",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: isUpdatingStatus || media.status === "APPROVED" ? "not-allowed" : "pointer",
                fontSize: "0.75rem",
                fontWeight: media.status === "APPROVED" ? "600" : "400",
              }}
            >
              Approve
            </button>
            <button
              onClick={() => handleStatusChange("REJECTED")}
              disabled={isUpdatingStatus || media.status === "REJECTED"}
              style={{
                padding: "0.25rem 0.5rem",
                backgroundColor: media.status === "REJECTED" ? "#dc3545" : "#f0f0f0",
                color: media.status === "REJECTED" ? "white" : "#333",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: isUpdatingStatus || media.status === "REJECTED" ? "not-allowed" : "pointer",
                fontSize: "0.75rem",
                fontWeight: media.status === "REJECTED" ? "600" : "400",
              }}
            >
              Reject
            </button>
          </div>
        </div>
      </td>

      {/* Product */}
      <td style={{ padding: "0.75rem" }}>
        <ProductAttach
          mediaId={media.id}
          productId={media.productId}
          product={media.product}
        />
      </td>

      {/* Created */}
      <td style={{ padding: "0.75rem" }}>
        {new Date(media.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </td>

      {/* Tags */}
      <td style={{ padding: "0.75rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {/* Tag chips */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {media.tags?.map((tag) => (
              <span
                key={tag.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.25rem 0.5rem",
                  backgroundColor: "#e3f2fd",
                  color: "#1976d2",
                  borderRadius: "12px",
                  fontSize: "0.75rem",
                  fontWeight: "500",
                }}
              >
                {tag.name}
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#1976d2",
                    cursor: "pointer",
                    padding: "0",
                    fontSize: "1rem",
                    lineHeight: "1",
                  }}
                  title="Remove tag"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {/* Add tag input */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
              placeholder="Add tag..."
              disabled={isAddingTag}
              style={{
                padding: "0.25rem 0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "0.875rem",
                width: "120px",
              }}
            />
            <button
              onClick={handleAddTag}
              disabled={isAddingTag || !newTag.trim()}
              style={{
                padding: "0.25rem 0.5rem",
                backgroundColor: isAddingTag ? "#ccc" : "#008060",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isAddingTag ? "not-allowed" : "pointer",
                fontSize: "0.875rem",
                whiteSpace: "nowrap",
              }}
            >
              {isAddingTag ? "..." : "Add"}
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}
/* eslint-enable react/prop-types */

export default function MediaRoute() {
  const { mediaList, filters, tagOptions, usage, usageCheck } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  
  const [searchQuery, setSearchQuery] = useState(filters.q || "");
  const [selectedStatus, setSelectedStatus] = useState(filters.status || "");
  const [selectedAttached, setSelectedAttached] = useState(filters.attached || "");
  const [selectedTag, setSelectedTag] = useState(filters.tag || "");
  
  // Bulk selection state
  const [selectedItems, setSelectedItems] = useState([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  
  const allSelected = selectedItems.length === mediaList.length && mediaList.length > 0;
  const someSelected = selectedItems.length > 0;
  
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(mediaList.map((m) => m.id));
    } else {
      setSelectedItems([]);
    }
  };
  
  const handleSelectItem = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };
  
  const handleBulkStatus = async (newStatus) => {
    if (!selectedItems.length) return;
    
    setIsBulkUpdating(true);
    try {
      await fetch("/api/media-bulk", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedItems, status: newStatus }),
      });
      
      // Refresh while preserving filters
      const form = document.getElementById("media-filters-form");
      if (form) {
        submit(form, { method: "get", replace: true, preventScrollReset: true });
      } else {
        window.location.reload();
      }
      setSelectedItems([]);
    } catch (error) {
      console.error("Bulk update failed:", error);
      setIsBulkUpdating(false);
    }
  };

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

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    // Use React Router submit to stay within the app (keeps session, no full page reload)
    submit(e.currentTarget, { method: "get", replace: true, preventScrollReset: true });
  };

  const handleApplyFilters = () => {
    const form = document.getElementById("media-filters-form");
    if (form) {
      submit(form, { method: "get", replace: true, preventScrollReset: true });
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedStatus("");
    setSelectedAttached("");
    setSelectedTag("");
    
    // Submit empty form
    const form = document.getElementById("media-filters-form");
    if (form) {
      // Clear all inputs first
      setTimeout(() => {
        submit(form, { method: "get", replace: true, preventScrollReset: true });
      }, 0);
    }
  };

  const hasActiveFilters = filters.q || filters.status || filters.attached || filters.tag;

  return (
    <s-page heading="UGC Media">
      {/* Usage Indicator */}
      {usageCheck && !usageCheck.allowed && (
        <s-section variant="critical">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <strong>⚠️ Media Limit Reached!</strong>
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem" }}>
                Your {usageCheck.plan} plan allows {usageCheck.limit} media items. You currently have {usageCheck.current}.
              </p>
            </div>
            <a
              href="/app/billing"
              style={{
                padding: "0.5rem 1rem",
                background: "#fff",
                color: "#dc3545",
                borderRadius: "4px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "0.9rem",
              }}
            >
              Upgrade Plan
            </a>
          </div>
        </s-section>
      )}

      {usage && usageCheck && (
        <s-section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "1rem",
              background: usageCheck.allowed ? "#f9f9f9" : "#fff3cd",
              borderRadius: "8px",
              border: `1px solid ${usageCheck.allowed ? "#e0e0e0" : "#f49342"}`,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.25rem" }}>
                Media Usage
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: "600" }}>
                {usage.mediaItems} / {usageCheck.limit === -1 ? "Unlimited" : usageCheck.limit}
              </div>
            </div>
            {usageCheck.limit !== -1 && (
              <div style={{ flex: 2 }}>
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    background: "#e0e0e0",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, (usage.mediaItems / usageCheck.limit) * 100)}%`,
                      height: "100%",
                      background: usage.mediaItems >= usageCheck.limit ? "#dc3545" : usage.mediaItems >= usageCheck.limit * 0.75 ? "#f49342" : "#008060",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.25rem" }}>
                  {usage.mediaItems >= usageCheck.limit ? "Limit reached" : usage.mediaItems >= usageCheck.limit * 0.75 ? "Approaching limit" : "Within limit"}
                </div>
              </div>
            )}
            {!usageCheck.allowed && (
              <a
                href="/app/billing"
                style={{
                  padding: "0.5rem 1rem",
                  background: "#0066cc",
                  color: "#fff",
                  borderRadius: "4px",
                  textDecoration: "none",
                  fontWeight: "500",
                  fontSize: "0.9rem",
                }}
              >
                Upgrade
              </a>
            )}
          </div>
        </s-section>
      )}

      {/* Filter Bar */}
      <s-section heading="Filters">
        <Form id="media-filters-form" method="get" onSubmit={handleFilterSubmit} style={{ marginBottom: "1rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            {/* Search */}
            <div>
              <label htmlFor="filter-search" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Search
              </label>
              <input
                id="filter-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="URL or caption..."
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              />
              {/* Hidden input to ensure value is submitted */}
              <input type="hidden" name="q" value={searchQuery} />
            </div>

            {/* Status */}
            <div>
              <label htmlFor="filter-status" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Status
              </label>
              <select
                id="filter-status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              >
                <option value="">All statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              {/* Hidden input to ensure value is submitted */}
              <input type="hidden" name="status" value={selectedStatus} />
            </div>

            {/* Product Attached */}
            <div>
              <label htmlFor="filter-product" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Product
              </label>
              <select
                id="filter-product"
                value={selectedAttached}
                onChange={(e) => setSelectedAttached(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              >
                <option value="">All</option>
                <option value="yes">Has product</option>
                <option value="no">No product</option>
              </select>
              {/* Hidden input to ensure value is submitted */}
              <input type="hidden" name="attached" value={selectedAttached} />
            </div>

            {/* Tag */}
            <div>
              <label htmlFor="filter-tag" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Tag
              </label>
              <select
                id="filter-tag"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              >
                <option value="">All tags</option>
                {tagOptions.map((tag) => (
                  <option key={tag.id} value={tag.slug}>
                    {tag.name}
                  </option>
                ))}
              </select>
              {/* Hidden input to ensure value is submitted */}
              <input type="hidden" name="tag" value={selectedTag} />
            </div>
          </div>

          {/* Filter Actions */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={handleApplyFilters}
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
              Apply Filters
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Clear All
              </button>
            )}
          </div>
        </Form>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
            {filters.q && (
              <span
                style={{
                  padding: "0.25rem 0.5rem",
                  backgroundColor: "#e3f2fd",
                  color: "#1976d2",
                  borderRadius: "12px",
                  fontSize: "0.875rem",
                }}
              >
                Search: {filters.q}
              </span>
            )}
            {filters.status && (
              <span
                style={{
                  padding: "0.25rem 0.5rem",
                  backgroundColor: "#fff3cd",
                  color: "#856404",
                  borderRadius: "12px",
                  fontSize: "0.875rem",
                }}
              >
                Status: {filters.status}
              </span>
            )}
            {filters.attached && (
              <span
                style={{
                  padding: "0.25rem 0.5rem",
                  backgroundColor: "#d4edda",
                  color: "#155724",
                  borderRadius: "12px",
                  fontSize: "0.875rem",
                }}
              >
                Product: {filters.attached === "yes" ? "Has product" : "No product"}
              </span>
            )}
            {filters.tag && (
              <span
                style={{
                  padding: "0.25rem 0.5rem",
                  backgroundColor: "#f8d7da",
                  color: "#721c24",
                  borderRadius: "12px",
                  fontSize: "0.875rem",
                }}
              >
                Tag: {filters.tag}
              </span>
            )}
          </div>
        )}

        {/* Results Count */}
        <div style={{ marginTop: "1rem", color: "#666", fontSize: "0.875rem" }}>
          Showing {mediaList.length} media items
          {hasActiveFilters && " (filtered)"}
        </div>
      </s-section>

      <s-section heading="Add New Media">
        {actionData?.limitReached && (
          <div
            style={{
              padding: "1rem",
              background: "#fff3cd",
              border: "1px solid #f49342",
              borderRadius: "6px",
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "start", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.2rem" }}>⚠️</span>
              <div>
                <strong style={{ color: "#856404" }}>Usage Limit Reached</strong>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "#856404" }}>
                  {actionData.error}
                </p>
                <a
                  href="/app/billing"
                  style={{
                    display: "inline-block",
                    marginTop: "0.5rem",
                    padding: "0.5rem 1rem",
                    background: "#0066cc",
                    color: "white",
                    borderRadius: "4px",
                    textDecoration: "none",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                  }}
                >
                  View Plans & Upgrade →
                </a>
              </div>
            </div>
          </div>
        )}

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
              disabled={!usageCheck?.allowed}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: actionData?.error
                  ? "1px solid #d32f2f"
                  : "1px solid #ccc",
                borderRadius: "4px",
                opacity: !usageCheck?.allowed ? 0.6 : 1,
                cursor: !usageCheck?.allowed ? "not-allowed" : "text",
              }}
            />
            {actionData?.error && !actionData?.limitReached && (
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
            disabled={!usageCheck?.allowed}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: !usageCheck?.allowed ? "#ccc" : "#008060",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: !usageCheck?.allowed ? "not-allowed" : "pointer",
              fontWeight: "500",
              opacity: !usageCheck?.allowed ? 0.6 : 1,
            }}
          >
            {!usageCheck?.allowed ? "Limit Reached" : "Save"}
          </button>
          {!usageCheck?.allowed && (
            <span style={{ marginLeft: "1rem", fontSize: "0.875rem", color: "#856404" }}>
              Upgrade your plan to add more media
            </span>
          )}
        </Form>
      </s-section>

      <s-section heading="Media Library">
        {/* Bulk Actions */}
        {someSelected && (
          <div
            style={{
              padding: "1rem",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
              marginBottom: "1rem",
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: "500", marginRight: "1rem" }}>
              {selectedItems.length} selected
            </span>
            <button
              onClick={() => handleBulkStatus("APPROVED")}
              disabled={isBulkUpdating}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: isBulkUpdating ? "#ccc" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isBulkUpdating ? "not-allowed" : "pointer",
                fontWeight: "500",
              }}
            >
              {isBulkUpdating ? "Updating..." : "Approve Selected"}
            </button>
            <button
              onClick={() => handleBulkStatus("REJECTED")}
              disabled={isBulkUpdating}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: isBulkUpdating ? "#ccc" : "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isBulkUpdating ? "not-allowed" : "pointer",
                fontWeight: "500",
              }}
            >
              {isBulkUpdating ? "Updating..." : "Reject Selected"}
            </button>
            <button
              onClick={() => handleBulkStatus("DRAFT")}
              disabled={isBulkUpdating}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: isBulkUpdating ? "#ccc" : "#666",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isBulkUpdating ? "not-allowed" : "pointer",
                fontWeight: "500",
              }}
            >
              {isBulkUpdating ? "Updating..." : "Set to Draft"}
            </button>
            <button
              onClick={() => setSelectedItems([])}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "white",
                color: "#333",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer",
                marginLeft: "auto",
              }}
            >
              Clear Selection
            </button>
          </div>
        )}

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
                  <th style={{ padding: "0.75rem", width: "40px" }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
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
                    Tags
                  </th>
                </tr>
              </thead>
              <tbody>
                {mediaList.map((media) => (
                  <MediaRow
                    key={media.id}
                    media={media}
                    getBadgeStyle={getBadgeStyle}
                    isSelected={selectedItems.includes(media.id)}
                    onSelect={handleSelectItem}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </s-section>
    </s-page>
  );
}

