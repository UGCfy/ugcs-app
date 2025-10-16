// app/components/MediaLightbox.jsx
// Professional lightbox for media editing
import { useState, useEffect } from "react";
import ProductAttach from "./ProductAttach";

/* eslint-disable react/prop-types */
export default function MediaLightbox({ media, allMedia, onClose, onNavigate }) {
  const [caption, setCaption] = useState(media.caption || "");
  const [status, setStatus] = useState(media.status);
  const [newTag, setNewTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const currentIndex = allMedia.findIndex((m) => m.id === media.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allMedia.length - 1;

  const isVideo = media.url.match(/\.(mp4|webm|mov)$/i);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrevious) onNavigate(allMedia[currentIndex - 1]);
      if (e.key === "ArrowRight" && hasNext) onNavigate(allMedia[currentIndex + 1]);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, hasPrevious, hasNext, onClose, onNavigate, allMedia]);

  // Track changes
  useEffect(() => {
    const changed = caption !== (media.caption || "") || status !== media.status;
    setHasChanges(changed);
  }, [caption, status, media.caption, media.status]);

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      // Update caption
      if (caption !== (media.caption || "")) {
        await fetch(`/api/media/${media.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption }),
        });
      }

      // Update status
      if (status !== media.status) {
        await fetch("/api/media-status", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId: media.id, status }),
        });
      }

      setHasChanges(false);
      window.location.reload();
    } catch (error) {
      console.error("Save failed:", error);
      setIsSaving(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;

    try {
      // Create tag
      const tagResp = await fetch("/api/tags", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTag.trim() }),
      });
      const tagData = await tagResp.json();

      // Link to media
      await fetch("/api/media-tags", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: media.id, tagId: tagData.tag.id }),
      });

      setNewTag("");
      window.location.reload();
    } catch (error) {
      console.error("Add tag failed:", error);
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
      window.location.reload();
    } catch (error) {
      console.error("Remove tag failed:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this media? This cannot be undone.")) {
      return;
    }

    try {
      await fetch(`/api/media/${media.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      window.location.reload();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete media");
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case "APPROVED":
        return { bg: "#d4edda", color: "#155724" };
      case "REJECTED":
        return { bg: "#f8d7da", color: "#721c24" };
      default:
        return { bg: "#fff3cd", color: "#856404" };
    }
  };

  const statusColor = getStatusColor(status);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.9)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
      onClick={onClose}
    >
      {/* Lightbox Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "12px",
          maxWidth: "1400px",
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Left: Media Preview */}
        <div
          style={{
            flex: "1 1 60%",
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            minHeight: "500px",
          }}
        >
          {isVideo ? (
            <video
              src={media.url}
              controls
              autoPlay
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
                objectFit: "contain",
              }}
            />
          ) : (
            <img
              src={media.url}
              alt={media.caption || "Media"}
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
                objectFit: "contain",
              }}
            />
          )}

          {/* Navigation Arrows */}
          {hasPrevious && (
            <button
              onClick={() => onNavigate(allMedia[currentIndex - 1])}
              style={{
                position: "absolute",
                left: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.9)",
                border: "none",
                cursor: "pointer",
                fontSize: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
              title="Previous (←)"
            >
              ‹
            </button>
          )}

          {hasNext && (
            <button
              onClick={() => onNavigate(allMedia[currentIndex + 1])}
              style={{
                position: "absolute",
                right: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.9)",
                border: "none",
                cursor: "pointer",
                fontSize: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
              title="Next (→)"
            >
              ›
            </button>
          )}

          {/* Counter */}
          <div
            style={{
              position: "absolute",
              top: "1rem",
              left: "1rem",
              padding: "0.5rem 1rem",
              background: "rgba(0,0,0,0.7)",
              color: "white",
              borderRadius: "20px",
              fontSize: "0.85rem",
              fontWeight: "500",
            }}
          >
            {currentIndex + 1} / {allMedia.length}
          </div>
        </div>

        {/* Right: Details Panel */}
        <div
          style={{
            flex: "0 0 400px",
            display: "flex",
            flexDirection: "column",
            maxHeight: "90vh",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "1.5rem",
              borderBottom: "1px solid #e0e0e0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Media Details</h2>
            <button
              onClick={onClose}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#f0f0f0",
                border: "none",
                cursor: "pointer",
                fontSize: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Close (Esc)"
            >
              ×
            </button>
          </div>

          {/* Scrollable Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
            {/* Status */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>
                Status
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {["DRAFT", "APPROVED", "REJECTED"].map((s) => {
                  const color = getStatusColor(s);
                  return (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      style={{
                        flex: 1,
                        padding: "0.75rem",
                        background: status === s ? color.bg : "#f9f9f9",
                        color: status === s ? color.color : "#666",
                        border: `2px solid ${status === s ? color.color : "#e0e0e0"}`,
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: status === s ? "600" : "500",
                        fontSize: "0.85rem",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {s === "DRAFT" && "📝"} {s === "APPROVED" && "✓"} {s === "REJECTED" && "✕"} {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Caption */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label htmlFor="lightbox-caption" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>
                Caption
              </label>
              <textarea
                id="lightbox-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  fontSize: "0.9rem",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Product */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>
                Product
              </label>
              {media.product ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem",
                    background: "#f9f9f9",
                    borderRadius: "6px",
                    border: "1px solid #e0e0e0",
                  }}
                >
                  {media.product.image && (
                    <img
                      src={media.product.image}
                      alt={media.product.title}
                      style={{
                        width: "48px",
                        height: "48px",
                        objectFit: "cover",
                        borderRadius: "6px",
                      }}
                    />
                  )}
                  <div style={{ flex: 1, fontSize: "0.9rem", fontWeight: "500" }}>
                    {media.product.title}
                  </div>
                  <button
                    onClick={async () => {
                      await fetch("/api/media-product", {
                        method: "DELETE",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ mediaId: media.id }),
                      });
                      window.location.reload();
                    }}
                    style={{
                      padding: "0.375rem 0.75rem",
                      background: "white",
                      color: "#dc3545",
                      border: "1px solid #dc3545",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      fontWeight: "500",
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <ProductAttach mediaId={media.id} />
              )}
            </div>

            {/* Tags */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>
                Tags
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                {media.mediaTags?.map((mt) => (
                  <span
                    key={mt.tag.id}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 0.75rem",
                      background: "#e3f2fd",
                      color: "#1976d2",
                      borderRadius: "16px",
                      fontSize: "0.85rem",
                      fontWeight: "500",
                    }}
                  >
                    {mt.tag.name}
                    <button
                      onClick={() => handleRemoveTag(mt.tag.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#1976d2",
                        cursor: "pointer",
                        padding: 0,
                        fontSize: "1.1rem",
                        lineHeight: 1,
                        fontWeight: "bold",
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag..."
                  style={{
                    flex: 1,
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                  }}
                />
                <button
                  onClick={handleAddTag}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#008060",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "500",
                    fontSize: "0.875rem",
                  }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Media Info */}
            <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#f9f9f9", borderRadius: "6px" }}>
              <div style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.5rem" }}>
                <strong>Source:</strong>{" "}
                {media.sourceType === "INSTAGRAM" && "📷 Instagram"}
                {media.sourceType === "TIKTOK" && "🎵 TikTok"}
                {media.sourceType === "UPLOAD" && "☁️ Upload"}
                {media.sourceType === "URL" && "🔗 URL"}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.5rem" }}>
                <strong>Type:</strong> {isVideo ? "🎬 Video" : "📷 Image"}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#666" }}>
                <strong>Created:</strong> {new Date(media.createdAt).toLocaleString()}
              </div>
            </div>

            {/* Analytics Preview (if available) */}
            {media._count && (media._count.views > 0 || media._count.clicks > 0) && (
              <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#e3f2fd", borderRadius: "6px", border: "1px solid #90caf9" }}>
                <div style={{ fontWeight: "600", fontSize: "0.9rem", marginBottom: "0.75rem", color: "#1976d2" }}>
                  📊 Performance
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#666" }}>Views</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16acf1" }}>
                      {media._count.views || 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#666" }}>Clicks</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#008060" }}>
                      {media._count.clicks || 0}
                    </div>
                  </div>
                </div>
                {media._count.views > 0 && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#666" }}>
                    CTR: {((media._count.clicks / media._count.views) * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            )}

            {/* Copy URL */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>
                Media URL
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={media.url}
                  readOnly
                  style={{
                    flex: 1,
                    padding: "0.5rem 0.75rem",
                    background: "#f9f9f9",
                    border: "1px solid #e0e0e0",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    color: "#666",
                  }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(media.url);
                    alert("URL copied!");
                  }}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#f0f0f0",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: "500",
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: "1.5rem",
              borderTop: "1px solid #e0e0e0",
              display: "flex",
              gap: "0.75rem",
              justifyContent: "space-between",
            }}
          >
            <button
              onClick={handleDelete}
              style={{
                padding: "0.75rem 1.25rem",
                background: "white",
                color: "#dc3545",
                border: "1px solid #dc3545",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              🗑️ Delete
            </button>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={onClose}
                style={{
                  padding: "0.75rem 1.25rem",
                  background: "#f0f0f0",
                  color: "#666",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: !hasChanges || isSaving ? "#ccc" : "#008060",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: !hasChanges || isSaving ? "not-allowed" : "pointer",
                  fontWeight: "600",
                }}
              >
                {isSaving ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Close on Escape hint */}
      <div
        style={{
          position: "absolute",
          bottom: "1rem",
          left: "50%",
          transform: "translateX(-50%)",
          padding: "0.5rem 1rem",
          background: "rgba(0,0,0,0.7)",
          color: "white",
          borderRadius: "20px",
          fontSize: "0.8rem",
        }}
      >
        Press Esc to close • ← → to navigate
      </div>
    </div>
  );
}
/* eslint-enable react/prop-types */

