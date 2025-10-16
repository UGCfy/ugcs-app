// app/routes/app.widget-setup.jsx
import { useState, useEffect } from "react";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { prisma } from "../lib/prisma.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  // Fetch available tags for dropdown
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    take: 100,
  });

  // Fetch sample approved media for preview
  const sampleMedia = await prisma.media.findMany({
    where: { status: "APPROVED" },
    include: {
      mediaTags: {
        include: { tag: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return {
    shop: session.shop,
    tags,
    sampleMedia: sampleMedia.map((m) => ({
      id: m.id,
      url: m.url,
      caption: m.caption,
      productId: m.productId,
      tags: m.mediaTags.map((mt) => mt.tag),
    })),
  };
};

export default function WidgetSetup() {
  const { shop, tags, sampleMedia } = useLoaderData();

  const [widgetType, setWidgetType] = useState("gallery");
  const [selectedTags, setSelectedTags] = useState([]);
  const [productId, setProductId] = useState("");
  const [productTitle, setProductTitle] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [columns, setColumns] = useState("3");
  const [limit, setLimit] = useState("12");
  const [layout, setLayout] = useState("grid");
  const [autoplay, setAutoplay] = useState(true);
  const [interval, setInterval] = useState("5000");
  const [storyDuration, setStoryDuration] = useState("5000");

  // Debounced product search
  useEffect(() => {
    if (!productSearch || productSearch.length < 2) {
      setProductResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/products-search?q=${encodeURIComponent(productSearch)}`, {
          credentials: "include",
        });
        const data = await response.json();
        setProductResults(data.items || []);
        setShowProductDropdown(true);
      } catch (error) {
        console.error("Product search failed:", error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearch]);

  // Generate embed code
  const generateEmbedCode = () => {
    const tagString = selectedTags.join(",");
    
    const attrs = [
      `data-shop="${shop}"`,
      tagString ? `data-tags="${tagString}"` : '',
      productId ? `data-product="${productId}"` : '',
      widgetType === 'gallery' ? `data-layout="${layout}"` : '',
      widgetType === 'gallery' ? `data-columns="${columns}"` : '',
      `data-limit="${limit}"`,
      widgetType === 'carousel' && autoplay ? `data-autoplay="true"` : '',
      widgetType === 'carousel' ? `data-interval="${interval}"` : '',
      widgetType === 'stories' ? `data-duration="${storyDuration}"` : '',
    ].filter(Boolean).join('\n     ');
    
    return `<!-- UGCfy Widget -->
<div id="ugcfy-${widgetType}" 
     ${attrs}>
</div>
<script src="https://cdn.ugcfy.com/widget.js"></script>`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateEmbedCode());
    alert("Embed code copied to clipboard!");
  };

  return (
    <s-page heading="Widget Setup">
      <s-section heading="Configure Your Widget">
        {/* eslint-disable jsx-a11y/label-has-associated-control */}
        <div style={{ display: "grid", gap: "1.5rem", maxWidth: "800px" }}>
          {/* Widget Type */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
              Widget Type
            </label>
            <select
              value={widgetType}
              onChange={(e) => setWidgetType(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            >
              <option value="gallery">Gallery (Grid)</option>
              <option value="carousel">Carousel (Slideshow)</option>
              <option value="stories">Stories (Vertical, Mobile-First)</option>
            </select>
          </div>

          {/* Gallery-specific options */}
          {widgetType === "gallery" && (
            <>
              {/* Layout */}
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                  Layout Style
                </label>
                <select
                  value={layout}
                  onChange={(e) => setLayout(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                >
                  <option value="grid">Grid</option>
                  <option value="masonry">Masonry (Coming Soon)</option>
                </select>
              </div>

              {/* Columns */}
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                  Columns
                </label>
                <select
                  value={columns}
                  onChange={(e) => setColumns(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                >
                  <option value="2">2 Columns</option>
                  <option value="3">3 Columns</option>
                  <option value="4">4 Columns</option>
                  <option value="6">6 Columns</option>
                </select>
              </div>
            </>
          )}

          {/* Carousel-specific options */}
          {widgetType === "carousel" && (
            <>
              {/* Autoplay */}
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={autoplay}
                    onChange={(e) => setAutoplay(e.target.checked)}
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span style={{ fontWeight: "500" }}>Auto-play slides</span>
                </label>
              </div>

              {/* Interval */}
              {autoplay && (
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                    Slide Duration
                  </label>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                    }}
                  >
                    <option value="3000">3 seconds</option>
                    <option value="5000">5 seconds</option>
                    <option value="7000">7 seconds</option>
                    <option value="10000">10 seconds</option>
                  </select>
                </div>
              )}
            </>
          )}

          {/* Stories-specific options */}
          {widgetType === "stories" && (
            <>
              {/* Story Duration */}
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                  Story Duration
                </label>
                <select
                  value={storyDuration}
                  onChange={(e) => setStoryDuration(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                >
                  <option value="3000">3 seconds</option>
                  <option value="5000">5 seconds</option>
                  <option value="7000">7 seconds</option>
                  <option value="10000">10 seconds</option>
                  <option value="15000">15 seconds</option>
                </select>
                <small style={{ color: "#666", fontSize: "0.875rem", display: "block", marginTop: "0.25rem" }}>
                  How long each story displays before auto-advancing
                </small>
              </div>

              <div style={{ background: "#e3f2fd", padding: "1rem", borderRadius: "6px" }}>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "#1976d2" }}>
                  💡 <strong>Tip:</strong> Stories work best on mobile devices! Use 9:16 vertical images/videos for optimal display.
                </p>
              </div>
            </>
          )}

          {/* Limit */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
              Number of Items
            </label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              min="1"
              max="50"
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </div>

          {/* Tags Filter */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
              Filter by Tags (optional)
            </label>
            <select
              multiple
              value={selectedTags}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
                setSelectedTags(selected);
              }}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                minHeight: "100px",
              }}
            >
              {tags.map((tag) => (
                <option key={tag.id} value={tag.slug}>
                  {tag.name}
                </option>
              ))}
            </select>
            <small style={{ color: "#666", fontSize: "0.875rem" }}>
              Hold Ctrl/Cmd to select multiple tags
            </small>
          </div>

          {/* Product Selector (for product page widgets) */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
              Filter by Product (optional)
            </label>
            
            {productId && productTitle ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  background: "#f9f9f9",
                }}
              >
                <span style={{ flex: 1, fontSize: "0.9rem" }}>{productTitle}</span>
                <button
                  onClick={() => {
                    setProductId("");
                    setProductTitle("");
                  }}
                  style={{
                    background: "#dc3545",
                    color: "white",
                    border: "none",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onFocus={() => productResults.length > 0 && setShowProductDropdown(true)}
                  onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                  placeholder="Search products by title..."
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
                
                {/* Dropdown with results */}
                {showProductDropdown && productResults.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "white",
                      border: "1px solid #ccc",
                      borderTop: "none",
                      borderRadius: "0 0 4px 4px",
                      maxHeight: "200px",
                      overflowY: "auto",
                      zIndex: 1000,
                      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                    }}
                  >
                    {productResults.map((product) => (
                      <div
                        key={product.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setProductId(product.id);
                          setProductTitle(product.title);
                          setProductSearch("");
                          setShowProductDropdown(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setProductId(product.id);
                            setProductTitle(product.title);
                            setProductSearch("");
                            setShowProductDropdown(false);
                          }
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.75rem",
                          cursor: "pointer",
                          borderBottom: "1px solid #f0f0f0",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f9f9f9")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                      >
                        {product.image && (
                          <img
                            src={product.image}
                            alt={product.title}
                            style={{
                              width: "40px",
                              height: "40px",
                              objectFit: "cover",
                              borderRadius: "4px",
                            }}
                          />
                        )}
                        <span style={{ fontSize: "0.9rem" }}>{product.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <small style={{ color: "#666", fontSize: "0.875rem", display: "block", marginTop: "0.25rem" }}>
              Show only UGC tagged with this product (useful for product pages)
            </small>
          </div>
        </div>
        {/* eslint-enable jsx-a11y/label-has-associated-control */}
      </s-section>

      {/* Live Preview */}
      <s-section heading="Live Preview">
        <div
          style={{
            border: "2px solid #e0e0e0",
            borderRadius: "8px",
            padding: "16px",
            backgroundColor: "#f9f9f9",
            minHeight: "400px",
          }}
        >
          <div style={{ marginBottom: "0.75rem", fontSize: "0.85rem", color: "#666" }}>
            Preview shows APPROVED media only. {sampleMedia.length === 0 && "No approved media yet - go to Media tab and approve some items."}
          </div>
          
          <div style={{ backgroundColor: "white", borderRadius: "4px", padding: "1rem" }}>
            {sampleMedia.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "#999" }}>
                <p style={{ margin: 0, fontSize: "1.1rem" }}>No approved media to preview</p>
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem" }}>Go to Media tab and approve some items to see them here</p>
              </div>
            ) : widgetType === "gallery" ? (
              // Gallery Preview
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gap: "12px",
                }}
              >
                {sampleMedia.slice(0, parseInt(limit)).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      position: "relative",
                      paddingBottom: "100%",
                      borderRadius: "8px",
                      overflow: "hidden",
                      cursor: "pointer",
                      background: "#f0f0f0",
                    }}
                  >
                    <img
                      src={item.url}
                      alt={item.caption || "UGC"}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : widgetType === "carousel" ? (
              // Carousel Preview
              <div style={{ maxWidth: "600px", margin: "0 auto" }}>
                <div
                  style={{
                    position: "relative",
                    borderRadius: "12px",
                    overflow: "hidden",
                    background: "#000",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      paddingBottom: "100%",
                    }}
                  >
                    <img
                      src={sampleMedia[0].url}
                      alt={sampleMedia[0].caption || "UGC"}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                    {sampleMedia[0].caption && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
                          color: "white",
                          padding: "2rem 1rem 1rem",
                          fontSize: "13px",
                        }}
                      >
                        {sampleMedia[0].caption}
                      </div>
                    )}
                  </div>
                  {/* Arrow indicators */}
                  <div
                    style={{
                      position: "absolute",
                      left: "1rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "rgba(255,255,255,0.9)",
                      borderRadius: "50%",
                      width: "40px",
                      height: "40px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    }}
                  >
                    ‹
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      right: "1rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "rgba(255,255,255,0.9)",
                      borderRadius: "50%",
                      width: "40px",
                      height: "40px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    }}
                  >
                    ›
                  </div>
                  {/* Dots */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "1rem",
                      left: "50%",
                      transform: "translateX(-50%)",
                      display: "flex",
                      gap: "8px",
                    }}
                  >
                    {sampleMedia.slice(0, Math.min(5, parseInt(limit))).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: i === 0 ? "24px" : "8px",
                          height: "8px",
                          borderRadius: "4px",
                          background: i === 0 ? "#fff" : "rgba(255,255,255,0.5)",
                        }}
                      />
                    ))}
                  </div>
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
                    }}
                  >
                    1 / {Math.min(sampleMedia.length, parseInt(limit))}
                  </div>
                </div>
                {/* Thumbnails */}
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", overflowX: "auto" }}>
                  {sampleMedia.slice(0, parseInt(limit)).map((item, i) => (
                    <div
                      key={item.id}
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "6px",
                        border: i === 0 ? "2px solid #16acf1" : "2px solid transparent",
                        overflow: "hidden",
                        flexShrink: 0,
                        opacity: i === 0 ? 1 : 0.6,
                      }}
                    >
                      <img
                        src={item.url}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : widgetType === "stories" ? (
              // Stories Preview
              <div style={{ maxWidth: "320px", margin: "0 auto" }}>
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "9/16",
                    borderRadius: "16px",
                    overflow: "hidden",
                    background: "#000",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  }}
                >
                  {/* Progress bars */}
                  <div
                    style={{
                      position: "absolute",
                      top: "12px",
                      left: "12px",
                      right: "12px",
                      display: "flex",
                      gap: "4px",
                      zIndex: 10,
                    }}
                  >
                    {sampleMedia.slice(0, Math.min(5, parseInt(limit))).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: "3px",
                          background: i === 0 ? "#fff" : "rgba(255,255,255,0.3)",
                          borderRadius: "2px",
                        }}
                      />
                    ))}
                  </div>

                  {/* Story image */}
                  <img
                    src={sampleMedia[0].url}
                    alt={sampleMedia[0].caption || "Story"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />

                  {/* Caption overlay */}
                  {sampleMedia[0].caption && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
                        padding: "3rem 1.5rem 1.5rem",
                        color: "white",
                        fontSize: "14px",
                        lineHeight: "1.4",
                      }}
                    >
                      <p style={{ margin: 0 }}>{sampleMedia[0].caption}</p>
                      <div style={{ fontSize: "12px", marginTop: "0.5rem", opacity: 0.8 }}>
                        1 of {Math.min(sampleMedia.length, parseInt(limit))}
                      </div>
                    </div>
                  )}

                  {/* Navigation hints */}
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "1rem",
                      transform: "translateY(-50%)",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "20px",
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
                      fontSize: "20px",
                    }}
                  >
                    ›
                  </div>
                </div>
                <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.85rem", color: "#666" }}>
                  📱 Optimized for mobile • Tap left/right to navigate • Auto-advances every {parseInt(storyDuration) / 1000} seconds
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </s-section>

      {/* Embed Code */}
      <s-section heading="Installation Code">
        <div>
          <p style={{ marginBottom: "1rem", color: "#666" }}>
            Copy and paste this code into your Shopify theme where you want the widget to appear.
          </p>
          
          <div style={{ position: "relative" }}>
            <pre
              style={{
                backgroundColor: "#1e1e1e",
                color: "#d4d4d4",
                padding: "1rem",
                borderRadius: "4px",
                overflow: "auto",
                fontSize: "0.875rem",
                lineHeight: "1.6",
              }}
            >
              {generateEmbedCode()}
            </pre>
            <button
              onClick={handleCopyCode}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                padding: "0.5rem 1rem",
                backgroundColor: "#008060",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Copy Code
            </button>
          </div>
        </div>

        {/* Installation Instructions */}
        <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#f0f8ff", borderRadius: "4px" }}>
          <h3 style={{ marginTop: 0, fontSize: "1.1rem" }}>📝 Installation Instructions</h3>
          <ol style={{ paddingLeft: "1.5rem", lineHeight: "1.8" }}>
            <li>Go to your Shopify admin → <strong>Online Store → Themes</strong></li>
            <li>Click <strong>Actions → Edit code</strong></li>
            <li>
              For <strong>homepage</strong>: Open <code>sections/main-page.liquid</code> or <code>templates/index.liquid</code>
            </li>
            <li>
              For <strong>product pages</strong>: Open <code>sections/main-product.liquid</code> or <code>templates/product.liquid</code>
            </li>
            <li>Paste the code where you want the widget to appear</li>
            <li>Click <strong>Save</strong></li>
            <li>View your store to see the widget in action! 🎉</li>
          </ol>
        </div>
      </s-section>
    </s-page>
  );
}

