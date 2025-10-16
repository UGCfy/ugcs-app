/**
 * UGCfy Widget Loader
 * Embeddable script for Shopify stores
 * 
 * Usage:
 * <div id="ugcfy-gallery" data-shop="mystore.myshopify.com" data-tags="summer,featured"></div>
 * <script src="https://cdn.ugcfy.com/widget.js"></script>
 */

(function () {
  'use strict';

  const WIDGET_VERSION = '1.0.0';

  // Widget initialization
  function initUGCfy() {
    // Find all widget containers
    const containers = document.querySelectorAll('[data-ugcfy-widget], [id^="ugcfy-"]');

    containers.forEach((container) => {
      // Extract widget type from id (e.g., "ugcfy-carousel" -> "carousel")
      const idMatch = container.id?.match(/^ugcfy-(.+)$/);
      const widgetType = container.getAttribute('data-ugcfy-widget') || 
                        container.getAttribute('data-widget') || 
                        (idMatch ? idMatch[1] : 'gallery');
      
      const config = {
        shop: container.getAttribute('data-shop') || window.Shopify?.shop,
        tags: container.getAttribute('data-tags') || '',
        product: container.getAttribute('data-product') || '',
        limit: container.getAttribute('data-limit') || (widgetType === 'carousel' ? '10' : widgetType === 'stories' ? '10' : '12'),
        layout: container.getAttribute('data-layout') || 'grid',
        columns: container.getAttribute('data-columns') || '3',
        autoplay: container.getAttribute('data-autoplay') === 'true',
        interval: container.getAttribute('data-interval') || '5000',
        duration: container.getAttribute('data-duration') || '5000',
      };

      if (!config.shop) {
        console.error('UGCfy: Shop parameter required');
        return;
      }

      // Build iframe URL
      const params = new URLSearchParams({
        shop: config.shop,
        tags: config.tags,
        product: config.product,
        limit: config.limit,
        layout: config.layout,
        columns: config.columns,
        autoplay: config.autoplay,
        interval: config.interval,
        duration: config.duration,
      });

      const iframeUrl = `https://${config.shop}/apps/ugc/widgets/${widgetType}?${params.toString()}`;

      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.style.width = '100%';
      iframe.style.border = 'none';
      iframe.style.minHeight = '400px';
      iframe.style.display = 'block';
      iframe.setAttribute('scrolling', 'no');
      iframe.setAttribute('loading', 'lazy');
      iframe.id = `ugcfy-iframe-${Date.now()}`;

      // Auto-resize iframe based on content
      window.addEventListener('message', function (e) {
        if (e.data && e.data.type === 'ugcfy:resize') {
          iframe.style.height = e.data.height + 'px';
        }

        // Handle media click events
        if (e.data && e.data.type === 'ugcfy:media:click') {
          const payload = e.data.payload;
          
          // Open lightbox or redirect to product
          if (payload.productId && window.Shopify) {
            // Shopify-specific: redirect to product
            const productHandle = payload.productId.split('/').pop();
            window.location.href = `/products/${productHandle}`;
          } else {
            // Generic: open in lightbox
            openLightbox(payload.url, payload.caption);
          }
        }
      });

      // Insert iframe
      container.innerHTML = '';
      container.appendChild(iframe);
    });
  }

  // Simple lightbox
  function openLightbox(url, caption) {
    const lightbox = document.createElement('div');
    lightbox.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.9);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;

    const isVideo = url.match(/\.(mp4|webm|mov)$/i);
    const media = isVideo
      ? `<video src="${url}" controls autoplay style="max-width:100%; max-height:90vh; border-radius:8px;">`
      : `<img src="${url}" style="max-width:100%; max-height:90vh; border-radius:8px;">`;

    lightbox.innerHTML = `
      <div style="position:relative; max-width:1200px; width:100%;">
        ${media}
        ${caption ? `<p style="color:white; margin-top:16px; text-align:center;">${caption}</p>` : ''}
        <button onclick="this.closest('div').parentElement.remove()" style="
          position:absolute;
          top:-40px;
          right:0;
          background:white;
          border:none;
          border-radius:50%;
          width:32px;
          height:32px;
          cursor:pointer;
          font-size:20px;
        ">×</button>
      </div>
    `;

    lightbox.onclick = function (e) {
      if (e.target === lightbox) lightbox.remove();
    };

    document.body.appendChild(lightbox);
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUGCfy);
  } else {
    initUGCfy();
  }

  // Expose global API
  window.UGCfy = {
    version: WIDGET_VERSION,
    init: initUGCfy,
    openLightbox: openLightbox,
  };
})();

