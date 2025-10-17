import { useState, useRef, useEffect } from "react";
import ProductCarousel from "./ProductCarousel";

/**
 * ShoppableVideoPlayer - Interactive video player with timed product hotspots
 * 
 * Features:
 * - Shows product hotspots at specific timestamps
 * - Click hotspot to see product details
 * - Product carousel when video pauses/ends
 * - Add to cart directly from video
 * - Tracks views and clicks
 */
export default function ShoppableVideoPlayer({ 
  videoUrl, 
  hotspots = [], 
  products = {},
  onHotspotClick,
  onAddToCart,
  editMode = false,
  onTimeUpdate,
  className = ""
}) {
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [hoveredHotspot, setHoveredHotspot] = useState(null);
  const [showCarousel, setShowCarousel] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);

  // Update current time
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    }
  };

  // Get visible hotspots at current time
  const visibleHotspots = hotspots.filter(h => {
    return currentTime >= h.timestamp && currentTime <= (h.timestamp + h.duration);
  });

  // Handle hotspot click
  const handleHotspotClick = (hotspot) => {
    if (editMode) {
      onHotspotClick?.(hotspot);
      return;
    }

    // Pause video and show product details
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setSelectedHotspot(hotspot);
    setIsPlaying(false);

    // Track click analytics
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        type: "click",
        mediaId: hotspot.mediaId,
        productId: hotspot.productId,
        clickType: "hotspot",
      }),
    });
  };

  // Position calculator
  const getPositionStyle = (position) => {
    const positions = {
      "top-left": { top: "20px", left: "20px" },
      "top-right": { top: "20px", right: "20px" },
      "bottom-left": { bottom: "80px", left: "20px" },
      "bottom-right": { bottom: "80px", right: "20px" },
      "center": { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
    };
    return positions[position] || positions["bottom-right"];
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Close product card and resume video
  const closeProductCard = () => {
    setSelectedHotspot(null);
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Handle video pause - show carousel after 1 second
  useEffect(() => {
    let timer;
    if (!isPlaying && !selectedHotspot && !hasEnded && currentTime > 0) {
      timer = setTimeout(() => {
        setShowCarousel(true);
      }, 1000);
    } else {
      setShowCarousel(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, selectedHotspot, hasEnded, currentTime]);

  // Convert products object to array for carousel
  const productArray = Object.values(products).filter(Boolean);

  return (
    <div className={`shoppable-video-container ${className}`}>
      <div className="video-wrapper">
        <video
          ref={videoRef}
          src={videoUrl}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setHasEnded(true);
            setShowCarousel(true);
          }}
          onClick={togglePlay}
          className="shoppable-video"
        />

        {/* Hotspot markers */}
        {visibleHotspots.map((hotspot) => {
          const product = products[hotspot.productId];
          if (!product) return null;

          return (
            <button
              key={hotspot.id}
              className={`hotspot-marker ${hoveredHotspot === hotspot.id ? 'hovered' : ''}`}
              style={getPositionStyle(hotspot.position)}
              onClick={(e) => {
                e.stopPropagation();
                handleHotspotClick(hotspot);
              }}
              onMouseEnter={() => setHoveredHotspot(hotspot.id)}
              onMouseLeave={() => setHoveredHotspot(null)}
            >
              <span className="hotspot-icon">🛍️</span>
              <span className="hotspot-label">{product.title}</span>
            </button>
          );
        })}

        {/* Play/Pause overlay */}
        {!isPlaying && !selectedHotspot && (
          <div className="play-overlay" onClick={togglePlay}>
            <svg width="80" height="80" viewBox="0 0 80 80" fill="white">
              <circle cx="40" cy="40" r="35" fill="rgba(0,0,0,0.5)" />
              <polygon points="30,20 30,60 60,40" fill="white" />
            </svg>
          </div>
        )}

        {/* Video controls */}
        <div className="video-controls">
          <button onClick={togglePlay} className="control-btn">
            {isPlaying ? "⏸" : "▶"}
          </button>
          <div className="time-display">
            {formatTime(currentTime)} / {formatTime(videoRef.current?.duration || 0)}
          </div>
          {editMode && (
            <div className="edit-mode-indicator">
              🎬 Edit Mode
            </div>
          )}
        </div>
      </div>

      {/* Product Card (shown when hotspot is clicked) */}
      {selectedHotspot && products[selectedHotspot.productId] && (
        <div className="product-card-overlay">
          <div className="product-card">
            <button className="close-card" onClick={closeProductCard}>
              ✕
            </button>
            <ProductCard 
              product={products[selectedHotspot.productId]}
              onAddToCart={() => {
                onAddToCart?.(products[selectedHotspot.productId]);
                closeProductCard();
              }}
            />
          </div>
        </div>
      )}

      {/* Product Carousel (shown when video pauses or ends) */}
      {showCarousel && productArray.length > 0 && !selectedHotspot && (
        <div 
          className="carousel-overlay"
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            padding: "1rem",
            background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)",
            zIndex: 50,
          }}
        >
          <ProductCarousel
            products={productArray}
            title={hasEnded ? "Shop from this video" : "Featured Products"}
            onProductClick={(product) => {
              if (videoRef.current) videoRef.current.pause();
              // Could open product details or navigate
            }}
            onAddToCart={(product) => {
              onAddToCart?.(product);
            }}
          />
        </div>
      )}

      <style>{`
        .shoppable-video-container {
          position: relative;
          width: 100%;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
        }

        .video-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 9/16;
        }

        .shoppable-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          cursor: pointer;
        }

        .hotspot-marker {
          position: absolute;
          background: rgba(255, 255, 255, 0.95);
          border: 2px solid #008060;
          border-radius: 24px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          animation: hotspot-pulse 2s ease-in-out infinite;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 10;
        }

        .hotspot-marker:hover,
        .hotspot-marker.hovered {
          transform: scale(1.1);
          background: white;
          box-shadow: 0 6px 20px rgba(0, 128, 96, 0.4);
        }

        .hotspot-icon {
          font-size: 20px;
        }

        .hotspot-label {
          font-weight: 600;
          color: #000;
          white-space: nowrap;
          font-size: 14px;
        }

        @keyframes hotspot-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .play-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 5;
        }

        .video-controls {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 10;
        }

        .control-btn {
          background: white;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          transition: transform 0.2s;
        }

        .control-btn:hover {
          transform: scale(1.1);
        }

        .time-display {
          color: white;
          font-size: 14px;
          font-weight: 500;
        }

        .edit-mode-indicator {
          margin-left: auto;
          background: #bf0711;
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .product-card-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          animation: fadeIn 0.2s ease;
        }

        .product-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          position: relative;
          animation: slideUp 0.3s ease;
        }

        .close-card {
          position: absolute;
          top: 12px;
          right: 12px;
          background: #f0f0f0;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 18px;
          transition: background 0.2s;
        }

        .close-card:hover {
          background: #e0e0e0;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Product Card Component
function ProductCard({ product, onAddToCart }) {
  const price = product.variants?.edges?.[0]?.node?.price || product.priceRange?.minVariantPrice;
  const image = product.featuredImage?.url || product.images?.edges?.[0]?.node?.url;

  return (
    <div className="product-card-content">
      {image && (
        <img src={image} alt={product.title} className="product-image" />
      )}
      <h3 className="product-title">{product.title}</h3>
      {product.description && (
        <p className="product-description">
          {product.description.substring(0, 120)}
          {product.description.length > 120 ? "..." : ""}
        </p>
      )}
      <div className="product-price">
        ${price?.amount || "0.00"} {price?.currencyCode || "USD"}
      </div>
      <button onClick={onAddToCart} className="add-to-cart-btn">
        🛒 Add to Cart
      </button>

      <style>{`
        .product-card-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .product-image {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
          border-radius: 8px;
        }

        .product-title {
          font-size: 20px;
          font-weight: 600;
          color: #000;
          margin: 0;
        }

        .product-description {
          font-size: 14px;
          color: #666;
          line-height: 1.5;
          margin: 0;
        }

        .product-price {
          font-size: 24px;
          font-weight: 700;
          color: #008060;
        }

        .add-to-cart-btn {
          background: #008060;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .add-to-cart-btn:hover {
          background: #006e52;
        }
      `}</style>
    </div>
  );
}

// Helper function
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

