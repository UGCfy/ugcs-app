// app/routes/widgets.stories.jsx
// Stories widget - vertical, mobile-first UGC display (Instagram Stories style)
import { useLoaderData } from "react-router";
import { useEffect, useState } from "react";
import { prisma } from "../lib/prisma.server";

// Performance: Cache headers for widget
export const headers = () => ({
  "Cache-Control": "public, max-age=300, s-maxage=600",
  "X-Content-Type-Options": "nosniff",
});

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const tags = url.searchParams.get("tags")?.split(",").filter(Boolean) || [];
  const productId = url.searchParams.get("product");
  const limit = parseInt(url.searchParams.get("limit") || "10", 10);
  const duration = parseInt(url.searchParams.get("duration") || "5000", 10);

  // Build query
  const where = {
    status: "APPROVED",
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
    take: Math.min(limit, 15),
  });

  const items = media.map((m) => ({
    id: m.id,
    url: m.url,
    caption: m.caption,
    productId: m.productId,
    tags: m.mediaTags.map((mt) => mt.tag.name),
  }));

  return { items, config: { shop, duration } };
};

export default function WidgetStories() {
  const { items, config } = useLoaderData();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(null);

  // Track view when story appears
  useEffect(() => {
    if (items.length > 0 && items[currentIndex]) {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "view",
          mediaId: items[currentIndex].id,
          shopDomain: config.shop,
          widgetId: "stories",
        }),
      }).catch(console.error);
    }
  }, [currentIndex, items, config.shop]);

  // Progress bar and auto-advance
  useEffect(() => {
    if (isPaused || items.length === 0) return;

    const interval = 50; // Update every 50ms
    const increment = (interval / config.duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Move to next story
          if (currentIndex < items.length - 1) {
            setCurrentIndex(currentIndex + 1);
            return 0;
          } else {
            // End of stories - loop back to start
            setCurrentIndex(0);
            return 0;
          }
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, items.length, config.duration]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === " ") {
        e.preventDefault();
        setIsPaused(!isPaused);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isPaused, currentIndex]);

  // Touch swipe handlers
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;
    
    const touchEnd = e.changedTouches[0].clientY;
    const distance = touchStart - touchEnd;
    
    if (Math.abs(distance) > 50) {
      if (distance > 0) {
        // Swipe up - next story
        goToNext();
      } else {
        // Swipe down - previous story
        goToPrevious();
      }
    }
    
    setTouchStart(null);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const goToNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    }
  };

  // Tap zones for navigation
  const handleTap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;

    if (x < third) {
      // Left third - previous
      goToPrevious();
    } else if (x > third * 2) {
      // Right third - next
      goToNext();
    } else {
      // Middle - toggle pause
      setIsPaused(!isPaused);
    }

    // Track click
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "click",
        mediaId: items[currentIndex].id,
        clickType: "media",
        shopDomain: config.shop,
        widgetId: "stories",
      }),
    }).catch(console.error);
  };

  if (!items || items.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
        <p>No UGC stories available yet.</p>
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
        background: "#000",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Stories Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "480px",
          aspectRatio: "9/16",
          background: "#000",
          overflow: "hidden",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Progress Bars */}
        <div
          style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            right: "12px",
            display: "flex",
            gap: "4px",
            zIndex: 20,
          }}
        >
          {items.map((_, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                height: "3px",
                background: "rgba(255,255,255,0.3)",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: index < currentIndex ? "100%" : index === currentIndex ? `${progress}%` : "0%",
                  height: "100%",
                  background: "#fff",
                  transition: index === currentIndex ? "width 0.05s linear" : "width 0.3s ease",
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Media */}
        {currentItem.url.match(/\.(mp4|webm|mov)$/i) ? (
          <video
            key={currentItem.id}
            src={currentItem.url}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            autoPlay
            muted
            loop
            playsInline
            onPlay={() => setIsPaused(false)}
            onPause={() => setIsPaused(true)}
          />
        ) : (
          <img
            key={currentItem.id}
            src={currentItem.url}
            alt={currentItem.caption || "Story"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}

        {/* Story Info Overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
            padding: "4rem 1.5rem 1.5rem",
            zIndex: 10,
          }}
        >
          {currentItem.caption && (
            <p
              style={{
                margin: 0,
                color: "white",
                fontSize: "15px",
                lineHeight: "1.5",
                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
              }}
            >
              {currentItem.caption}
            </p>
          )}
          
          {/* Story counter */}
          <div
            style={{
              marginTop: "0.75rem",
              fontSize: "12px",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            {currentIndex + 1} of {items.length}
          </div>
        </div>

        {/* Pause indicator */}
        {isPaused && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(0,0,0,0.6)",
              borderRadius: "50%",
              width: "60px",
              height: "60px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "24px",
              zIndex: 15,
            }}
          >
            ⏸
          </div>
        )}

        {/* Navigation hints (subtle) */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "1rem",
            transform: "translateY(-50%)",
            color: "rgba(255,255,255,0.5)",
            fontSize: "24px",
            pointerEvents: "none",
            opacity: currentIndex === 0 ? 0.3 : 0.6,
          }}
        >
          ‹
        </div>
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: "1rem",
            transform: "translateY(-50%)",
            color: "rgba(255,255,255,0.5)",
            fontSize: "24px",
            pointerEvents: "none",
            opacity: currentIndex === items.length - 1 ? 0.3 : 0.6,
          }}
        >
          ›
        </div>
      </div>

      {/* Instructions (only on desktop) */}
      <div
        style={{
          position: "fixed",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.8)",
          color: "white",
          padding: "0.75rem 1.5rem",
          borderRadius: "24px",
          fontSize: "13px",
          display: window.innerWidth > 768 ? "block" : "none",
          zIndex: 100,
        }}
      >
        👆 Tap left/right to navigate • Tap center to pause • Swipe up/down on mobile
      </div>
    </div>
  );
}

