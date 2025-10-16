import { useLoaderData, Form, useSubmit } from "react-router";
import { useState } from "react";
import { authenticate } from "../../shopify.server";
import prisma from "../../db.server";
import FileUploader from "../../components/FileUploader";
import MediaCard from "../../components/MediaCard";
import { canPerformAction, getUsageStats } from "../../lib/usage-limits";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  // Parse filter params
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const tag = (url.searchParams.get("tag") || "").trim();
  const status = (url.searchParams.get("status") || "").trim();
  const attached = (url.searchParams.get("attached") || "").trim();
  const mediaType = (url.searchParams.get("type") || "").trim();

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
      // Media type filter
      mediaType === "images"
        ? {
            AND: [
              { url: { not: { endsWith: ".mp4" } } },
              { url: { not: { endsWith: ".webm" } } },
              { url: { not: { endsWith: ".mov" } } },
            ],
          }
        : {},
      mediaType === "videos"
        ? { OR: [{ url: { endsWith: ".mp4" } }, { url: { endsWith: ".webm" } }, { url: { endsWith: ".mov" } }] }
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
    take: 100,
  });

  // Fetch tag options for filter dropdown
  const tagOptions = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    take: 100,
    select: { id: true, name: true, slug: true },
  });

  // Fetch product details for media with productId
  const productIds = media.map((m) => m.productId).filter(Boolean);
  const productMap = {};

  if (productIds.length > 0) {
    const gql = `#graphql
      query GetProducts($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            featuredImage {
              url(transform: { maxWidth: 100, maxHeight: 100 })
            }
          }
        }
      }
    `;

    try {
      const resp = await admin.graphql(gql, { variables: { ids: productIds } });
      const json = await resp.json();

      for (const node of json.data?.nodes || []) {
        if (node?.id) {
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

  // Attach product data to media
  const mediaList = media.map((m) => ({
    ...m,
    product: m.productId ? productMap[m.productId] : null,
    mediaTags: m.mediaTags.map((mt) => ({
      id: mt.id,
      tag: {
        id: mt.tag.id,
        name: mt.tag.name,
        slug: mt.tag.slug,
      },
    })),
  }));

  // Get usage stats for plan limits
  const usage = await getUsageStats(session.shop);
  const usageCheck = await canPerformAction(session.shop, "create_media", usage);

  return {
    mediaList,
    filters: { q, tag, status, attached, type: mediaType },
    tagOptions,
    usage,
    usageCheck,
  };
};

export default function MediaRoute() {
  const { mediaList, filters, tagOptions, usage, usageCheck } = useLoaderData();
  const submit = useSubmit();
  
  const [searchQuery, setSearchQuery] = useState(filters.q || "");
  const [selectedStatus, setSelectedStatus] = useState(filters.status || "");
  const [selectedAttached, setSelectedAttached] = useState(filters.attached || "");
  const [selectedTag, setSelectedTag] = useState(filters.tag || "");
  const [selectedType, setSelectedType] = useState(filters.type || "");
  
  // Bulk selection state
  const [selectedItems, setSelectedItems] = useState([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const handleSelectItem = (id, checked) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter((item) => item !== id));
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(mediaList.map((m) => m.id));
    } else {
      setSelectedItems([]);
    }
  };

  const allSelected = mediaList.length > 0 && selectedItems.length === mediaList.length;
  const someSelected = selectedItems.length > 0;

  const handleBulkUpdate = async (newStatus) => {
    if (!someSelected) return;
    
    setIsBulkUpdating(true);
    
    try {
      const response = await fetch("/api/media-bulk", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaIds: selectedItems,
          status: newStatus,
        }),
      });

      if (!response.ok) throw new Error("Bulk update failed");
      
      // Reload page to see updates
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

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    // Use React Router submit to stay within the app
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
    setSelectedType("");
    
    // Submit empty form
    const form = document.getElementById("media-filters-form");
    if (form) {
      setTimeout(() => {
        submit(form, { method: "get", replace: true, preventScrollReset: true });
      }, 0);
    }
  };

  const hasActiveFilters = filters.q || filters.status || filters.attached || filters.tag || filters.type;

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
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            {/* Search */}
            <div>
              <label htmlFor="filter-search" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "0.85rem" }}>
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
                  fontSize: "0.9rem",
                }}
              />
              <input type="hidden" name="q" value={searchQuery} />
            </div>

            {/* Media Type */}
            <div>
              <label htmlFor="filter-type" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "0.85rem" }}>
                Media Type
              </label>
              <select
                id="filter-type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "0.9rem",
                }}
              >
                <option value="">All types</option>
                <option value="images">📷 Images only</option>
                <option value="videos">🎬 Videos only</option>
              </select>
              <input type="hidden" name="type" value={selectedType} />
            </div>

            {/* Status */}
            <div>
              <label htmlFor="filter-status" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "0.85rem" }}>
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
                  fontSize: "0.9rem",
                }}
              >
                <option value="">All statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <input type="hidden" name="status" value={selectedStatus} />
            </div>

            {/* Product Attached */}
            <div>
              <label htmlFor="filter-product" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "0.85rem" }}>
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
                  fontSize: "0.9rem",
                }}
              >
                <option value="">All</option>
                <option value="yes">Has product</option>
                <option value="no">No product</option>
              </select>
              <input type="hidden" name="attached" value={selectedAttached} />
            </div>

            {/* Tag */}
            <div>
              <label htmlFor="filter-tag" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "0.85rem" }}>
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
                  fontSize: "0.9rem",
                }}
              >
                <option value="">All tags</option>
                {tagOptions.map((tag) => (
                  <option key={tag.id} value={tag.slug}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <input type="hidden" name="tag" value={selectedTag} />
            </div>
          </div>

          {/* Filter Actions */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={handleApplyFilters}
              style={{
                padding: "0.5rem 1.5rem",
                background: "#0066cc",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "0.9rem",
              }}
            >
              Apply Filters
            </button>
            
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                style={{
                  padding: "0.5rem 1.5rem",
                  background: "white",
                  color: "#666",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {filters.q && (
                <span style={{ padding: "0.375rem 0.75rem", background: "#e3f2fd", color: "#1976d2", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "500" }}>
                  Search: {filters.q}
                </span>
              )}
              {filters.type && (
                <span style={{ padding: "0.375rem 0.75rem", background: "#e3f2fd", color: "#1976d2", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "500" }}>
                  Type: {filters.type === "images" ? "Images" : "Videos"}
                </span>
              )}
              {filters.status && (
                <span style={{ padding: "0.375rem 0.75rem", background: "#e3f2fd", color: "#1976d2", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "500" }}>
                  Status: {filters.status}
                </span>
              )}
              {filters.attached && (
                <span style={{ padding: "0.375rem 0.75rem", background: "#e3f2fd", color: "#1976d2", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "500" }}>
                  Product: {filters.attached === "yes" ? "Attached" : "Not attached"}
                </span>
              )}
              {filters.tag && (
                <span style={{ padding: "0.375rem 0.75rem", background: "#e3f2fd", color: "#1976d2", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "500" }}>
                  Tag: {tagOptions.find((t) => t.slug === filters.tag)?.name || filters.tag}
                </span>
              )}
            </div>
          )}
        </Form>
        
        <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.5rem" }}>
          Showing {mediaList.length} media items
          {hasActiveFilters && " (filtered)"}
        </div>
      </s-section>

      {/* Upload Media */}
      <s-section heading="Upload Media">
        {!usageCheck?.allowed ? (
          <div
            style={{
              padding: "2rem",
              background: "#fff3cd",
              border: "2px solid #f49342",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#856404" }}>Media Limit Reached</h3>
            <p style={{ margin: "0 0 1rem 0", color: "#666" }}>
              Your plan allows {usageCheck.limit} media items. You currently have {usageCheck.current}.
            </p>
            <a
              href="/app/billing"
              style={{
                display: "inline-block",
                padding: "0.75rem 2rem",
                background: "#0066cc",
                color: "white",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: "600",
              }}
            >
              Upgrade Plan to Add More Media →
            </a>
          </div>
        ) : (
          <FileUploader
            onUploadComplete={() => {
              window.location.reload();
            }}
            maxFiles={10}
          />
        )}
      </s-section>

      {/* Media Library */}
      <s-section heading="Media Library">
        {/* Bulk Actions */}
        {someSelected && (
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 100,
              padding: "1rem",
              background: "#16acf1",
              color: "white",
              borderRadius: "8px",
              marginBottom: "1rem",
              boxShadow: "0 4px 12px rgba(22, 172, 241, 0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
              <div style={{ fontWeight: "600" }}>
                {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  onClick={() => handleBulkUpdate("APPROVED")}
                  disabled={isBulkUpdating}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#008060",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isBulkUpdating ? "not-allowed" : "pointer",
                    fontWeight: "500",
                    fontSize: "0.85rem",
                  }}
                >
                  ✓ Approve Selected
                </button>
                <button
                  onClick={() => handleBulkUpdate("REJECTED")}
                  disabled={isBulkUpdating}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isBulkUpdating ? "not-allowed" : "pointer",
                    fontWeight: "500",
                    fontSize: "0.85rem",
                  }}
                >
                  ✕ Reject Selected
                </button>
                <button
                  onClick={() => handleBulkUpdate("DRAFT")}
                  disabled={isBulkUpdating}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "white",
                    color: "#16acf1",
                    border: "1px solid white",
                    borderRadius: "4px",
                    cursor: isBulkUpdating ? "not-allowed" : "pointer",
                    fontWeight: "500",
                    fontSize: "0.85rem",
                  }}
                >
                  Set to Draft
                </button>
                <button
                  onClick={() => setSelectedItems([])}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "rgba(255,255,255,0.2)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.5)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {mediaList.length === 0 ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center", background: "#f9f9f9", borderRadius: "8px" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📸</div>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.2rem", color: "#333" }}>No media found</h3>
            <p style={{ margin: 0, color: "#666" }}>
              {hasActiveFilters ? "Try adjusting your filters" : "Start by uploading your first UGC content above"}
            </p>
          </div>
        ) : (
          <>
            {/* Select All Option */}
            <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "#f9f9f9", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <span style={{ fontWeight: "500", fontSize: "0.9rem" }}>
                  Select all {mediaList.length} items
                </span>
              </label>
            </div>

            {/* Card Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {mediaList.map((media) => (
                <MediaCard
                  key={media.id}
                  media={media}
                  isSelected={selectedItems.includes(media.id)}
                  onSelect={handleSelectItem}
                />
              ))}
            </div>
          </>
        )}
      </s-section>
    </s-page>
  );
}
