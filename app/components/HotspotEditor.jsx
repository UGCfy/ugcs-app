import { useState, useEffect } from "react";

/**
 * HotspotEditor - Add/edit product hotspots to videos
 * Appears in MediaLightbox for video media only
 */
export default function HotspotEditor({ mediaId, videoUrl }) {
  const [hotspots, setHotspots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  // New hotspot form
  const [newHotspot, setNewHotspot] = useState({
    productId: "",
    timestamp: 0,
    duration: 5.0,
    position: "bottom-right",
  });

  // Load existing hotspots
  useEffect(() => {
    loadHotspots();
  }, [mediaId]);

  const loadHotspots = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/hotspots?mediaId=${mediaId}`, {
        credentials: "include",
      });
      const data = await res.json();
      setHotspots(data.hotspots || []);
    } catch (error) {
      console.error("Failed to load hotspots:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddHotspot = async (e) => {
    e.preventDefault();
    
    if (!newHotspot.productId) {
      alert("Please select a product");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("intent", "create");
      formData.append("mediaId", mediaId);
      formData.append("productId", newHotspot.productId);
      formData.append("timestamp", newHotspot.timestamp);
      formData.append("duration", newHotspot.duration);
      formData.append("position", newHotspot.position);

      const res = await fetch("/api/hotspots", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        await loadHotspots();
        setIsAdding(false);
        setNewHotspot({
          productId: "",
          timestamp: currentTime,
          duration: 5.0,
          position: "bottom-right",
        });
      }
    } catch (error) {
      console.error("Failed to add hotspot:", error);
      alert("Failed to add hotspot");
    }
  };

  const handleDeleteHotspot = async (hotspotId) => {
    if (!confirm("Delete this hotspot?")) return;

    try {
      const formData = new FormData();
      formData.append("intent", "delete");
      formData.append("id", hotspotId);

      const res = await fetch("/api/hotspots", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        await loadHotspots();
      }
    } catch (error) {
      console.error("Failed to delete hotspot:", error);
    }
  };

  const handleUseCurrentTime = () => {
    setNewHotspot({ ...newHotspot, timestamp: currentTime });
  };

  if (isLoading) {
    return <div style={{ padding: "1rem", color: "#666" }}>Loading hotspots...</div>;
  }

  return (
    <div className="hotspot-editor">
      <div className="hotspot-header">
        <h4 style={{ margin: 0, fontSize: "0.9rem", fontWeight: "600" }}>
          🛍️ Shoppable Hotspots
        </h4>
        <button
          onClick={() => {
            setNewHotspot({ ...newHotspot, timestamp: currentTime });
            setIsAdding(true);
          }}
          className="add-hotspot-btn"
        >
          + Add Hotspot
        </button>
      </div>

      <p style={{ fontSize: "0.85rem", color: "#666", margin: "0.5rem 0 1rem" }}>
        Add product tags that appear at specific times in your video
      </p>

      {/* Video preview with time display */}
      <div className="video-preview">
        <video
          src={videoUrl}
          controls
          onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
          style={{
            width: "100%",
            borderRadius: "6px",
            marginBottom: "0.5rem",
          }}
        />
        <div style={{ fontSize: "0.85rem", color: "#666", textAlign: "center" }}>
          Current time: {formatTime(currentTime)}
        </div>
      </div>

      {/* Add hotspot form */}
      {isAdding && (
        <form onSubmit={handleAddHotspot} className="add-hotspot-form">
          <h5 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>New Hotspot</h5>
          
          <div className="form-field">
            <label>Product Search</label>
            <input
              type="text"
              placeholder="Search products..."
              className="product-search"
            />
            <small style={{ color: "#666" }}>
              Search and select a product to tag
            </small>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Time (seconds)</label>
              <input
                type="number"
                step="0.1"
                value={newHotspot.timestamp}
                onChange={(e) => setNewHotspot({ ...newHotspot, timestamp: parseFloat(e.target.value) })}
                className="input"
              />
              <button type="button" onClick={handleUseCurrentTime} className="use-current-btn">
                Use Current Time
              </button>
            </div>

            <div className="form-field">
              <label>Duration (seconds)</label>
              <input
                type="number"
                step="0.5"
                value={newHotspot.duration}
                onChange={(e) => setNewHotspot({ ...newHotspot, duration: parseFloat(e.target.value) })}
                className="input"
              />
            </div>
          </div>

          <div className="form-field">
            <label>Position</label>
            <select
              value={newHotspot.position}
              onChange={(e) => setNewHotspot({ ...newHotspot, position: e.target.value })}
              className="input"
            >
              <option value="top-left">Top Left</option>
              <option value="top-right">Top Right</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="center">Center</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="submit" className="save-btn">
              Save Hotspot
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="cancel-btn"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Existing hotspots list */}
      <div className="hotspots-list">
        <h5 style={{ margin: "1rem 0 0.5rem", fontSize: "0.9rem", fontWeight: "600" }}>
          Hotspots ({hotspots.length})
        </h5>
        {hotspots.length === 0 ? (
          <div className="empty-state">
            <p style={{ color: "#666", fontSize: "0.85rem", textAlign: "center", margin: "1rem 0" }}>
              No hotspots yet. Click "Add Hotspot" to get started!
            </p>
          </div>
        ) : (
          <div className="hotspot-items">
            {hotspots.map((hotspot) => (
              <div key={hotspot.id} className="hotspot-item">
                <div className="hotspot-info">
                  <div className="hotspot-product">Product #{hotspot.productId.slice(-6)}</div>
                  <div className="hotspot-time">
                    {formatTime(hotspot.timestamp)} - {formatTime(hotspot.timestamp + hotspot.duration)}
                  </div>
                  <div className="hotspot-position">{hotspot.position}</div>
                </div>
                <button
                  onClick={() => handleDeleteHotspot(hotspot.id)}
                  className="delete-hotspot-btn"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .hotspot-editor {
          border-top: 1px solid #e0e0e0;
          padding-top: 1.5rem;
          margin-top: 1.5rem;
        }

        .hotspot-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .add-hotspot-btn {
          background: #008060;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .add-hotspot-btn:hover {
          background: #006e52;
        }

        .video-preview {
          margin: 1rem 0;
          background: #f9f9f9;
          padding: 0.75rem;
          border-radius: 8px;
        }

        .add-hotspot-form {
          background: #f9f9f9;
          padding: 1rem;
          border-radius: 8px;
          margin: 1rem 0;
          border: 2px solid #008060;
        }

        .form-field {
          margin-bottom: 0.75rem;
        }

        .form-field label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 0.375rem;
          color: #333;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .input,
        .product-search {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 0.85rem;
        }

        .use-current-btn {
          margin-top: 0.375rem;
          width: 100%;
          padding: 0.375rem;
          background: white;
          border: 1px solid #008060;
          color: #008060;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
        }

        .use-current-btn:hover {
          background: #f0f9f7;
        }

        .form-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .save-btn {
          flex: 1;
          padding: 0.625rem;
          background: #008060;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
        }

        .save-btn:hover {
          background: #006e52;
        }

        .cancel-btn {
          padding: 0.625rem 1rem;
          background: white;
          color: #666;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 0.85rem;
          cursor: pointer;
        }

        .cancel-btn:hover {
          background: #f9f9f9;
        }

        .hotspots-list {
          margin-top: 1.5rem;
        }

        .hotspot-items {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .hotspot-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          transition: border-color 0.2s;
        }

        .hotspot-item:hover {
          border-color: #008060;
        }

        .hotspot-info {
          flex: 1;
          font-size: 0.85rem;
        }

        .hotspot-product {
          font-weight: 600;
          color: #000;
          margin-bottom: 0.25rem;
        }

        .hotspot-time {
          color: #666;
          font-size: 0.8rem;
        }

        .hotspot-position {
          color: #008060;
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }

        .delete-hotspot-btn {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 0.25rem;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .delete-hotspot-btn:hover {
          opacity: 1;
        }

        .empty-state {
          padding: 2rem 1rem;
          text-align: center;
          color: #999;
        }
      `}</style>
    </div>
  );
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

