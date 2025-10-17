import { prisma } from "../lib/prisma.server";

/**
 * Shoppable Video Widget
 * Renders interactive videos with product hotspots on storefront
 * URL: /apps/ugc/widgets/shoppable?mediaId=xxx&shop=xxx
 */

export const headers = () => ({
  "Cache-Control": "public, max-age=300", // 5 min cache
  "X-Content-Type-Options": "nosniff",
});

export async function loader({ request }) {
  const url = new URL(request.url);
  const mediaId = url.searchParams.get("mediaId");
  const shop = url.searchParams.get("shop");

  if (!mediaId) {
    return { error: "mediaId required" };
  }

  try {
    // Get media with hotspots
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      include: {
        hotspots: {
          orderBy: { timestamp: "asc" },
        },
      },
    });

    if (!media) {
      return { error: "Media not found" };
    }

    // Only show approved media
    if (media.status !== "APPROVED") {
      return { error: "Media not available" };
    }

    // Get product details from Shopify for each hotspot
    const productIds = [...new Set(media.hotspots.map(h => h.productId))];
    const products = {}; // We'll fetch these from Shopify in a moment

    // Track view
    await prisma.mediaView.create({
      data: {
        mediaId: media.id,
        shopDomain: shop,
        widgetId: "shoppable-video",
        referrer: request.headers.get("referer"),
        userAgent: request.headers.get("user-agent"),
      },
    });

    return { media, products };
  } catch (error) {
    console.error("Error loading shoppable video:", error);
    return { error: "Failed to load video" };
  }
}

export default function ShoppableVideoWidget() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Shoppable Video</title>
      </head>
      <body style={{ margin: 0, padding: 0, background: "transparent" }}>
        <div id="shoppable-video-root"></div>

        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: `
              // Shoppable Video Widget Client
              (async function() {
                const params = new URLSearchParams(window.location.search);
                const mediaId = params.get('mediaId');
                const shop = params.get('shop');

                if (!mediaId || !shop) {
                  console.error('Missing required params');
                  return;
                }

                // Fetch video data
                const res = await fetch(window.location.href);
                const { media, products } = await res.json();

                if (!media) {
                  console.error('No media data');
                  return;
                }

                // Render shoppable video
                renderShoppableVideo(media, products);

                function renderShoppableVideo(media, products) {
                  const root = document.getElementById('shoppable-video-root');
                  
                  const container = document.createElement('div');
                  container.className = 'shoppable-video-container';
                  container.innerHTML = \`
                    <div class="video-wrapper">
                      <video
                        id="shoppable-video"
                        src="\${media.url}"
                        playsinline
                        controls
                        style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;"
                      ></video>
                      <div id="hotspots-container"></div>
                    </div>
                    <div id="product-card-container"></div>
                  \`;

                  root.appendChild(container);

                  const video = document.getElementById('shoppable-video');
                  const hotspotsContainer = document.getElementById('hotspots-container');
                  const productCardContainer = document.getElementById('product-card-container');

                  // Show hotspots at the right time
                  video.addEventListener('timeupdate', () => {
                    const currentTime = video.currentTime;
                    hotspotsContainer.innerHTML = '';

                    media.hotspots.forEach(hotspot => {
                      if (currentTime >= hotspot.timestamp && 
                          currentTime <= hotspot.timestamp + hotspot.duration) {
                        showHotspot(hotspot, products[hotspot.productId]);
                      }
                    });
                  });

                  function showHotspot(hotspot, product) {
                    const marker = document.createElement('button');
                    marker.className = 'hotspot-marker';
                    marker.style.cssText = getPositionStyle(hotspot.position);
                    marker.innerHTML = \`
                      <span class="hotspot-icon">🛍️</span>
                      <span class="hotspot-label">\${product?.title || 'Shop Now'}</span>
                    \`;

                    marker.onclick = (e) => {
                      e.stopPropagation();
                      video.pause();
                      showProductCard(hotspot, product);
                      trackClick(media.id, hotspot.productId);
                    };

                    hotspotsContainer.appendChild(marker);
                  }

                  function showProductCard(hotspot, product) {
                    productCardContainer.innerHTML = \`
                      <div class="product-card-overlay">
                        <div class="product-card">
                          <button class="close-card" onclick="this.closest('.product-card-overlay').remove(); document.getElementById('shoppable-video').play();">
                            ✕
                          </button>
                          <img src="\${product.image || ''}" alt="\${product.title}" class="product-image">
                          <h3 class="product-title">\${product.title}</h3>
                          <p class="product-description">\${product.description?.substring(0, 120) || ''}...</p>
                          <div class="product-price">\${product.price || '$0.00'}</div>
                          <a href="\${product.url || '#'}" class="shop-btn" target="_top">
                            🛒 Shop Now
                          </a>
                        </div>
                      </div>
                    \`;
                  }

                  function getPositionStyle(position) {
                    const positions = {
                      'top-left': 'top: 20px; left: 20px;',
                      'top-right': 'top: 20px; right: 20px;',
                      'bottom-left': 'bottom: 80px; left: 20px;',
                      'bottom-right': 'bottom: 80px; right: 20px;',
                      'center': 'top: 50%; left: 50%; transform: translate(-50%, -50%);'
                    };
                    return 'position: absolute; ' + (positions[position] || positions['bottom-right']);
                  }

                  function trackClick(mediaId, productId) {
                    fetch('/api/track', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        type: 'click',
                        mediaId,
                        productId,
                        clickType: 'hotspot'
                      })
                    });
                  }
                }

                // Notify parent of iframe height
                function updateHeight() {
                  const height = document.body.scrollHeight;
                  window.parent.postMessage({ type: 'resize', height }, '*');
                }
                
                updateHeight();
                window.addEventListener('resize', updateHeight);
              })();
            `,
          }}
        />

        <style>{`
          * {
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }

          .shoppable-video-container {
            position: relative;
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
          }

          .video-wrapper {
            position: relative;
            width: 100%;
            aspect-ratio: 9/16;
            background: #000;
            border-radius: 8px;
            overflow: hidden;
          }

          #hotspots-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
          }

          #hotspots-container > * {
            pointer-events: auto;
          }

          .hotspot-marker {
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
            font-family: inherit;
            font-size: 14px;
          }

          .hotspot-marker:hover {
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
          }

          @keyframes hotspot-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }

          .product-card-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
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
            max-height: 90vh;
            overflow-y: auto;
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
            font-family: inherit;
          }

          .close-card:hover {
            background: #e0e0e0;
          }

          .product-image {
            width: 100%;
            aspect-ratio: 1;
            object-fit: cover;
            border-radius: 8px;
            margin-bottom: 16px;
          }

          .product-title {
            font-size: 20px;
            font-weight: 600;
            color: #000;
            margin: 0 0 12px;
          }

          .product-description {
            font-size: 14px;
            color: #666;
            line-height: 1.5;
            margin: 0 0 16px;
          }

          .product-price {
            font-size: 24px;
            font-weight: 700;
            color: #008060;
            margin-bottom: 16px;
          }

          .shop-btn {
            display: block;
            width: 100%;
            background: #008060;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 14px 24px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            text-align: center;
          }

          .shop-btn:hover {
            background: #006e52;
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
      </body>
    </html>
  );
}

