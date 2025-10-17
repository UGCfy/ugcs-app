import { useState, useEffect, useRef } from "react";

/**
 * ProductCarousel - Swipeable product recommendation carousel
 * Shows when video pauses or ends
 * 
 * Features:
 * - Touch/swipe gestures
 * - Auto-scroll
 * - Add to cart
 * - Product quick view
 */
export default function ProductCarousel({ 
  products = [], 
  title = "Shop from this video",
  onProductClick,
  onAddToCart,
  className = ""
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const carouselRef = useRef(null);

  if (!products || products.length === 0) {
    return null;
  }

  // Handle mouse/touch drag
  const handleStart = (e) => {
    setIsDragging(true);
    const pageX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    setStartX(pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const pageX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    const x = pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  // Scroll to specific product
  const scrollTo = (index) => {
    if (carouselRef.current) {
      const cardWidth = 200; // Card width + gap
      carouselRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      });
      setCurrentIndex(index);
    }
  };

  // Previous/Next buttons
  const handlePrevious = () => {
    const newIndex = Math.max(0, currentIndex - 1);
    scrollTo(newIndex);
  };

  const handleNext = () => {
    const newIndex = Math.min(products.length - 1, currentIndex + 1);
    scrollTo(newIndex);
  };

  return (
    <div className={`product-carousel ${className}`}>
      <div className="carousel-header">
        <h3 className="carousel-title">{title}</h3>
        <div className="carousel-controls">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="nav-btn"
            aria-label="Previous"
          >
            ‹
          </button>
          <span className="carousel-counter">
            {currentIndex + 1} / {products.length}
          </span>
          <button
            onClick={handleNext}
            disabled={currentIndex === products.length - 1}
            className="nav-btn"
            aria-label="Next"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={carouselRef}
        className={`carousel-track ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      >
        {products.map((product, index) => (
          <ProductCard
            key={product.id || index}
            product={product}
            onProductClick={() => onProductClick?.(product)}
            onAddToCart={() => onAddToCart?.(product)}
            isDragging={isDragging}
          />
        ))}
      </div>

      {/* Dots indicator */}
      {products.length > 1 && (
        <div className="carousel-dots">
          {products.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`dot ${index === currentIndex ? 'active' : ''}`}
              aria-label={`Go to product ${index + 1}`}
            />
          ))}
        </div>
      )}

      <style>{`
        .product-carousel {
          background: white;
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          max-width: 100%;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .carousel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          gap: 1rem;
        }

        .carousel-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #000;
        }

        .carousel-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .nav-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f0f0f0;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 20px;
          transition: all 0.2s;
          color: #333;
        }

        .nav-btn:hover:not(:disabled) {
          background: #008060;
          color: white;
          transform: scale(1.1);
        }

        .nav-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .carousel-counter {
          font-size: 0.85rem;
          color: #666;
          font-weight: 500;
          min-width: 50px;
          text-align: center;
        }

        .carousel-track {
          display: flex;
          gap: 1rem;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          -ms-overflow-style: none;
          cursor: grab;
          padding-bottom: 0.5rem;
        }

        .carousel-track::-webkit-scrollbar {
          display: none;
        }

        .carousel-track.dragging {
          cursor: grabbing;
          scroll-snap-type: none;
        }

        .carousel-dots {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #d0d0d0;
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 0.2s;
        }

        .dot:hover {
          background: #a0a0a0;
        }

        .dot.active {
          width: 24px;
          border-radius: 4px;
          background: #008060;
        }

        @media (max-width: 768px) {
          .carousel-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .carousel-controls {
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  );
}

// Individual product card in carousel
function ProductCard({ product, onProductClick, onAddToCart, isDragging }) {
  const handleClick = (e) => {
    if (isDragging) {
      e.preventDefault();
      return;
    }
    onProductClick?.();
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (isDragging) return;
    onAddToCart?.();
  };

  const price = product.variants?.edges?.[0]?.node?.price || 
                product.priceRange?.minVariantPrice || 
                product.price;
  const image = product.featuredImage?.url || 
                product.images?.edges?.[0]?.node?.url || 
                product.image;

  return (
    <div className="product-card" onClick={handleClick}>
      {image && (
        <div className="product-image-wrapper">
          <img
            src={image}
            alt={product.title}
            className="product-image"
            draggable="false"
          />
        </div>
      )}
      
      <div className="product-info">
        <h4 className="product-title">{product.title}</h4>
        
        {price && (
          <div className="product-price">
            ${typeof price === 'object' ? price.amount : price} 
            {typeof price === 'object' && price.currencyCode && ` ${price.currencyCode}`}
          </div>
        )}

        <button
          onClick={handleAddToCart}
          className="add-to-cart-btn"
        >
          🛒 Add to Cart
        </button>
      </div>

      <style>{`
        .product-card {
          flex: 0 0 180px;
          scroll-snap-align: start;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
        }

        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-color: #008060;
        }

        .product-image-wrapper {
          width: 100%;
          aspect-ratio: 1;
          background: #f9f9f9;
          overflow: hidden;
        }

        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          pointer-events: none;
        }

        .product-info {
          padding: 0.75rem;
        }

        .product-title {
          margin: 0 0 0.5rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: #000;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 2.6em;
        }

        .product-price {
          font-size: 0.95rem;
          font-weight: 700;
          color: #008060;
          margin-bottom: 0.75rem;
        }

        .add-to-cart-btn {
          width: 100%;
          background: #008060;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.5rem;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          font-family: inherit;
        }

        .add-to-cart-btn:hover {
          background: #006e52;
        }

        .add-to-cart-btn:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
}

