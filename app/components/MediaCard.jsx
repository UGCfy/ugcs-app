// app/components/MediaCard.jsx
// Visual card component for media items
import { useState } from "react";

/* eslint-disable react/prop-types */
export default function MediaCard({ media, isSelected, onSelect }) {
  const [showActions, setShowActions] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  const isVideo = media.url.match(/\.(mp4|webm|mov)$/i);

  const getBadgeColor = (status) => {
    switch (status) {
      case "APPROVED":
        return { bg: "#d4edda", color: "#155724" };
      case "REJECTED":
        return { bg: "#f8d7da", color: "#721c24" };
      default:
        return { bg: "#fff3cd", color: "#856404" };
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      await fetch("/api/media-status", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: media.id, status: newStatus }),
      });
      window.location.reload();
    } catch (error) {
      console.error("Status update failed:", error);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;

    try {
      // Create tag if doesn't exist
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
      setIsAddingTag(false);
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

  const statusColors = getBadgeColor(media.status);

  return (
    <div
      style={{
        position: "relative",
        background: isSelected ? "#e3f2fd" : "white",
        border: `2px solid ${isSelected ? "#16acf1" : "#e0e0e0"}`,
        borderRadius: "12px",
        overflow: "hidden",
        transition: "all 0.2s ease",
        boxShadow: isSelected ? "0 4px 12px rgba(22, 172, 241, 0.2)" : "0 2px 4px rgba(0,0,0,0.05)",
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Checkbox for bulk selection */}
      <div
        style={{
          position: "absolute",
          top: "8px",
          left: "8px",
          zIndex: 10,
        }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(media.id, e.target.checked)}
          style={{
            width: "20px",
            height: "20px",
            cursor: "pointer",
          }}
        />
      </div>

      {/* Media Thumbnail */}
      <div
        style={{
          position: "relative",
          paddingBottom: "100%",
          background: "#f0f0f0",
          overflow: "hidden",
        }}
      >
        {isVideo ? (
          <>
            <video
              src={media.url}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              muted
            />
            {/* Video play icon */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                color: "white",
              }}
            >
              ▶
            </div>
          </>
        ) : (
          <img
            src={media.url}
            alt={media.caption || "Media"}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}

        {/* Status badge */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            padding: "4px 10px",
            background: statusColors.bg,
            color: statusColors.color,
            borderRadius: "12px",
            fontSize: "0.7rem",
            fontWeight: "600",
            textTransform: "uppercase",
          }}
        >
          {media.status}
        </div>

        {/* Source type badge */}
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            left: "8px",
            padding: "4px 8px",
            background: "rgba(0,0,0,0.7)",
            color: "white",
            borderRadius: "4px",
            fontSize: "0.65rem",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {media.sourceType === "INSTAGRAM" && "📷 IG"}
          {media.sourceType === "TIKTOK" && "🎵 TT"}
          {media.sourceType === "UPLOAD" && "☁️ Upload"}
          {media.sourceType === "URL" && "🔗 URL"}
        </div>

        {/* Quick Actions Overlay */}
        {showActions && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "1rem",
            }}
          >
            {media.status !== "APPROVED" && (
              <button
                onClick={() => handleStatusUpdate("APPROVED")}
                style={{
                  padding: "8px 16px",
                  background: "#008060",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                }}
              >
                ✓ Approve
              </button>
            )}
            {media.status !== "REJECTED" && (
              <button
                onClick={() => handleStatusUpdate("REJECTED")}
                style={{
                  padding: "8px 16px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                }}
              >
                ✕ Reject
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div style={{ padding: "12px" }}>
        {/* Caption */}
        {media.caption && (
          <div
            style={{
              fontSize: "0.85rem",
              color: "#333",
              marginBottom: "8px",
              lineHeight: "1.4",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {media.caption}
          </div>
        )}

        {/* Product */}
        {media.product ? (
          <div style={{ fontSize: "0.75rem", color: "#666", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
            <span>🏷️</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {media.product.title}
            </span>
          </div>
        ) : null}

        {/* Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
          {media.mediaTags?.map((mt) => (
            <span
              key={mt.tag.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "3px 8px",
                background: "#f0f0f0",
                borderRadius: "12px",
                fontSize: "0.7rem",
                color: "#666",
              }}
            >
              {mt.tag.name}
              <button
                onClick={() => handleRemoveTag(mt.tag.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#999",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "0.9rem",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
          
          {!isAddingTag && (
            <button
              onClick={() => setIsAddingTag(true)}
              style={{
                padding: "3px 8px",
                background: "transparent",
                border: "1px dashed #ccc",
                borderRadius: "12px",
                fontSize: "0.7rem",
                color: "#999",
                cursor: "pointer",
              }}
            >
              + Tag
            </button>
          )}
        </div>

        {/* Add tag input */}
        {isAddingTag && (
          <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTag();
                if (e.key === "Escape") setIsAddingTag(false);
              }}
              placeholder="Tag name..."
              style={{
                flex: 1,
                padding: "4px 8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "0.75rem",
              }}
            />
            <button
              onClick={handleAddTag}
              style={{
                padding: "4px 12px",
                background: "#008060",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              Add
            </button>
          </div>
        )}

        {/* Created date */}
        <div style={{ fontSize: "0.7rem", color: "#999", marginTop: "8px" }}>
          {new Date(media.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
/* eslint-enable react/prop-types */

