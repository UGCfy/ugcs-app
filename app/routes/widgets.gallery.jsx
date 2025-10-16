// app/routes/widgets.gallery.jsx
// Public widget route - accessible via App Proxy at: https://store.myshopify.com/apps/ugc/widgets/gallery
import { useLoaderData } from "react-router";
import { useEffect } from "react";
import { prisma } from "../lib/prisma.server";

// Performance: Cache headers for widget
export const headers = () => ({
  "Cache-Control": "public, max-age=300, s-maxage=600", // 5min browser, 10min CDN
  "X-Content-Type-Options": "nosniff",
});

export const loader = async ({ request }) => {
  // Parse query params from widget
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const tags = url.searchParams.get("tags")?.split(",").filter(Boolean) || [];
  const productId = url.searchParams.get("product");
  const limit = parseInt(url.searchParams.get("limit") || "12", 10);
  const layout = url.searchParams.get("layout") || "grid"; // grid, carousel, masonry
  const columns = parseInt(url.searchParams.get("columns") || "3", 10);

  // Build query
  const where = {
    status: "APPROVED", // Only show approved content
    ...(productId ? { productId } : {}),
    ...(tags.length > 0
      ? {
          mediaTags: {
            some: {
              tag: {
                slug: { in: tags },
              },
            },
          },
        }
      : {}),
  };

  // Fetch media
  const media = await prisma.media.findMany({
    where,
    include: {
      mediaTags: {
        include: { tag: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 50), // Max 50 for performance
  });

  // Shape data for widget
  const items = media.map((m) => ({
    id: m.id,
    url: m.url,
    caption: m.caption,
    productId: m.productId,
    tags: m.mediaTags.map((mt) => mt.tag.name),
    createdAt: m.createdAt,
  }));

  return { items, config: { layout, columns, shop } };
};

export default function WidgetGallery() {
  const { items, config } = useLoaderData();

  // Track views when items become visible
  useEffect(() => {
    const tracked = new Set();
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const mediaId = entry.target.getAttribute("data-media-id");
            if (mediaId && !tracked.has(mediaId)) {
              tracked.add(mediaId);
              
              // Track view
              fetch("/api/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "view",
                  mediaId,
                  shopDomain: config.shop,
                  widgetId: "gallery", // can be dynamic later
                }),
              }).catch(console.error);
            }
          }
        });
      },
      { threshold: 0.5 } // 50% visible
    );

    // Observe all media items
    document.querySelectorAll("[data-media-id]").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items, config.shop]);

  // Auto-resize iframe to fit content
  useEffect(() => {
    const sendHeight = () => {
      if (window.parent) {
        const height = document.documentElement.scrollHeight;
        window.parent.postMessage(
          { type: "ugcfy:resize", height },
          "*"
        );
      }
    };

    sendHeight();
    window.addEventListener("resize", sendHeight);
    return () => window.removeEventListener("resize", sendHeight);
  }, [items]);

  // Inline styles for fast loading (no external CSS)
  const containerStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${config.columns}, 1fr)`,
    gap: "16px",
    padding: "16px",
    maxWidth: "100%",
  };

  const itemStyle = {
    position: "relative",
    aspectRatio: "1",
    borderRadius: "8px",
    overflow: "hidden",
    cursor: "pointer",
    backgroundColor: "#f5f5f5",
  };

  const mediaStyle = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "transform 0.3s ease",
  };

  const overlayStyle = {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
    padding: "12px",
    color: "white",
    fontSize: "14px",
    opacity: 0,
    transition: "opacity 0.3s ease",
  };

  const handleItemClick = (item) => {
    // PostMessage to parent window for cart actions or lightbox
    if (window.parent) {
      window.parent.postMessage(
        {
          type: "ugcfy:media:click",
          payload: { id: item.id, url: item.url, productId: item.productId },
        },
        "*"
      );
    }
  };

  if (items.length === 0) {
    return (
      <div style={{ padding: "32px", textAlign: "center", color: "#666" }}>
        <p>No UGC content available yet.</p>
      </div>
    );
  }

  // Track media click
  const handleMediaClick = (item, clickType = "media") => {
    // Track the click
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "click",
        mediaId: item.id,
        clickType,
        productId: clickType === "product" ? item.productId : undefined,
        shopDomain: config.shop,
        widgetId: "gallery",
      }),
    }).catch(console.error);

    // Then open lightbox
    handleItemClick(item);
  };

  return (
    <div style={containerStyle}>
      {items.map((item) => (
        <div
          key={item.id}
          data-media-id={item.id}
          style={itemStyle}
          onClick={() => handleMediaClick(item, "media")}
          onMouseEnter={(e) => {
            const overlay = e.currentTarget.querySelector(".ugc-overlay");
            const media = e.currentTarget.querySelector("img, video");
            if (overlay) overlay.style.opacity = "1";
            if (media) media.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            const overlay = e.currentTarget.querySelector(".ugc-overlay");
            const media = e.currentTarget.querySelector("img, video");
            if (overlay) overlay.style.opacity = "0";
            if (media) media.style.transform = "scale(1)";
          }}
        >
          {/* Video or Image */}
          {item.url.match(/\.(mp4|webm|mov)$/i) ? (
            <video
              src={item.url}
              style={mediaStyle}
              muted
              loop
              playsInline
              onMouseEnter={(e) => e.currentTarget.play()}
              onMouseLeave={(e) => {
                e.currentTarget.pause();
                e.currentTarget.currentTime = 0;
              }}
            />
          ) : (
            <img
              src={item.url}
              alt={item.caption || "UGC"}
              style={mediaStyle}
              loading="lazy"
            />
          )}

          {/* Hover Overlay */}
          <div className="ugc-overlay" style={overlayStyle}>
            {item.caption && (
              <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.4" }}>
                {item.caption.length > 60
                  ? item.caption.substring(0, 60) + "..."
                  : item.caption}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

