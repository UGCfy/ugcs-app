// app/routes/widgets.carousel.jsx
// Carousel widget - swipeable UGC slideshow
import { useLoaderData } from "react-router";
import { useEffect, useState } from "react";
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
  const limit = parseInt(url.searchParams.get("limit") || "10", 10);
  const autoplay = url.searchParams.get("autoplay") === "true";
  const interval = parseInt(url.searchParams.get("interval") || "5000", 10);

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
    take: Math.min(limit, 20), // Max 20 for carousel
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

  return { items, config: { shop, autoplay, interval } };
};

export default function WidgetCarousel() {
  const { items, config } = useLoaderData();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Auto-resize iframe
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
  }, [items, currentIndex]);

  // Track views when items become visible
  useEffect(() => {
    if (items.length > 0 && items[currentIndex]) {
      const mediaId = items[currentIndex].id;
      
      // Track view
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "view",
          mediaId,
          shopDomain: config.shop,
          widgetId: "carousel",
        }),
      }).catch(console.error);
    }
  }, [currentIndex, items, config.shop]);

  // Auto-play
  useEffect(() => {
    if (!config.autoplay || items.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, config.interval);

    return () => clearInterval(timer);
  }, [config.autoplay, config.interval, items.length]);

  // Touch handlers for mobile swipe
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  };

  const handleMediaClick = (item) => {
    // Track click
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "click",
        mediaId: item.id,
        clickType: "media",
        shopDomain: config.shop,
        widgetId: "carousel",
      }),
    }).catch(console.error);

    // Open in lightbox or redirect
    if (item.productId) {
      window.parent.postMessage(
        { type: "ugcfy:navigate", url: `/products/${item.productId}` },
        "*"
      );
    }
  };

  if (!items || items.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
        <p>No UGC content available yet.</p>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        margin: 0,
        padding: 0,
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      {/* Carousel Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "800px",
          margin: "0 auto",
          borderRadius: "12px",
          overflow: "hidden",
          background: "#000",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Main Image/Video */}
        <div
          style={{
            position: "relative",
            width: "100%",
            paddingBottom: "100%", // 1:1 aspect ratio
            background: "#000",
            cursor: "pointer",
          }}
          onClick={() => handleMediaClick(currentItem)}
        >
          {currentItem.url.match(/\.(mp4|webm|mov)$/i) ? (
            <video
              key={currentItem.id}
              src={currentItem.url}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img
              key={currentItem.id}
              src={currentItem.url}
              alt={currentItem.caption || "UGC"}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          )}

          {/* Caption Overlay */}
          {currentItem.caption && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)",
                color: "white",
                padding: "2rem 1.5rem 1rem",
                fontSize: "14px",
                lineHeight: "1.4",
              }}
            >
              {currentItem.caption}
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        {items.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              style={{
                position: "absolute",
                left: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.9)",
                border: "none",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                zIndex: 10,
              }}
              aria-label="Previous"
            >
              ‹
            </button>
            <button
              onClick={goToNext}
              style={{
                position: "absolute",
                right: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.9)",
                border: "none",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                zIndex: 10,
              }}
              aria-label="Next"
            >
              ›
            </button>
          </>
        )}

        {/* Dot Indicators */}
        {items.length > 1 && (
          <div
            style={{
              position: "absolute",
              bottom: "1rem",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "8px",
              zIndex: 10,
            }}
          >
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                style={{
                  width: index === currentIndex ? "24px" : "8px",
                  height: "8px",
                  borderRadius: "4px",
                  background: index === currentIndex ? "#fff" : "rgba(255,255,255,0.5)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Counter */}
        <div
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "rgba(0,0,0,0.6)",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "500",
          }}
        >
          {currentIndex + 1} / {items.length}
        </div>
      </div>

      {/* Thumbnails (optional) */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginTop: "1rem",
          overflowX: "auto",
          padding: "0.5rem 0",
          maxWidth: "800px",
          margin: "1rem auto 0",
        }}
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => setCurrentIndex(index)}
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "6px",
              border: index === currentIndex ? "2px solid #16acf1" : "2px solid transparent",
              padding: 0,
              cursor: "pointer",
              flexShrink: 0,
              overflow: "hidden",
              background: "#f0f0f0",
              opacity: index === currentIndex ? 1 : 0.6,
              transition: "all 0.2s ease",
            }}
          >
            <img
              src={item.url}
              alt={item.caption || "Thumbnail"}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

