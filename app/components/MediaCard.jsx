// app/components/MediaCard.jsx
// Visual card component for media items

/* eslint-disable react/prop-types */
export default function MediaCard({ media, isSelected, onSelect, onClick }) {
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

  const statusColors = getBadgeColor(media.status);

  return (
    <div
      role="button"
      tabIndex={0}
      style={{
        position: "relative",
        background: isSelected ? "#e3f2fd" : "white",
        border: `2px solid ${isSelected ? "#16acf1" : "#e0e0e0"}`,
        borderRadius: "12px",
        overflow: "hidden",
        transition: "all 0.2s ease",
        boxShadow: isSelected ? "0 4px 12px rgba(22, 172, 241, 0.2)" : "0 2px 4px rgba(0,0,0,0.05)",
        cursor: "pointer",
      }}
      onClick={(e) => {
        // Don't open lightbox if clicking checkbox
        if (e.target.type === "checkbox") return;
        onClick(media);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(media);
        }
      }}
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
            {/* Video thumbnail - show first frame */}
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
              playsInline
              preload="metadata"
            />
            {/* Video play icon overlay */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                color: "white",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
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
            loading="lazy"
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
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px", minHeight: "24px" }}>
          {media.mediaTags && media.mediaTags.length > 0 ? (
            media.mediaTags.map((mt) => (
              <span
                key={mt.tag.id}
                style={{
                  display: "inline-block",
                  padding: "3px 8px",
                  background: "#e3f2fd",
                  color: "#1976d2",
                  borderRadius: "12px",
                  fontSize: "0.7rem",
                  fontWeight: "500",
                }}
              >
                {mt.tag.name}
              </span>
            ))
          ) : (
            <span style={{ fontSize: "0.7rem", color: "#999", fontStyle: "italic" }}>
              No tags
            </span>
          )}
        </div>

        {/* Created date */}
        <div style={{ fontSize: "0.7rem", color: "#999", marginTop: "8px" }}>
          {new Date(media.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
/* eslint-enable react/prop-types */

