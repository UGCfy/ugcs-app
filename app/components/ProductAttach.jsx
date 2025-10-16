// app/components/ProductAttach.jsx
import { useState, useEffect, useRef } from "react";

/* eslint-disable react/prop-types */
export default function ProductAttach({ mediaId, productId, product }) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  // Handle search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        const res = await fetch(
          `/api/products-search?q=${encodeURIComponent(searchQuery)}`,
          { credentials: "include" }
        );
        const data = await res.json();
        setSearchResults(data.items || []);
        setShowDropdown(true);
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (selectedProduct) => {
    setBusy(true);
    setShowDropdown(false);
    setSearchQuery("");

    try {
      await fetch("/api/media-product", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId,
          productId: selectedProduct.id,
        }),
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to set product:", error);
      setBusy(false);
    }
  };

  const handleUnset = async () => {
    setBusy(true);

    try {
      await fetch("/api/media-product", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, productId }),
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to unset product:", error);
      setBusy(false);
    }
  };

  const handleChangeClick = () => {
    setIsSearching(true);
    setSearchQuery("");
    setSearchResults([]);
  };

  // If product is attached and not searching, show product info
  if (productId && product && !isSearching) {
    return (
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        {product.image && (
          <img
            src={product.image}
            alt={product.title}
            style={{
              width: "32px",
              height: "32px",
              objectFit: "cover",
              borderRadius: "4px",
              border: "1px solid #ddd",
            }}
          />
        )}
        <span style={{ fontSize: "0.875rem", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {product.title || productId}
        </span>
        <button
          onClick={handleChangeClick}
          disabled={busy}
          style={{
            padding: "0.25rem 0.5rem",
            backgroundColor: "#008060",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: busy ? "not-allowed" : "pointer",
            fontSize: "0.875rem",
          }}
        >
          {busy ? "..." : "Change"}
        </button>
        <button
          onClick={handleUnset}
          disabled={busy}
          style={{
            padding: "0.25rem 0.5rem",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: busy ? "not-allowed" : "pointer",
            fontSize: "0.875rem",
          }}
        >
          {busy ? "..." : "Unset"}
        </button>
      </div>
    );
  }

  // Search interface
  return (
    <div style={{ position: "relative", minWidth: "240px" }} ref={searchRef}>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => searchQuery.trim() && setShowDropdown(true)}
        placeholder="Search products..."
        disabled={busy}
        style={{
          width: "100%",
          padding: "0.5rem",
          border: "1px solid #ccc",
          borderRadius: "4px",
          fontSize: "0.875rem",
        }}
      />

      {showDropdown && searchResults.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            backgroundColor: "white",
            border: "1px solid #ddd",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            maxHeight: "300px",
            overflowY: "auto",
            zIndex: 1000,
          }}
        >
          {searchResults.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "none",
                borderBottom: "1px solid #eee",
                backgroundColor: "white",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
              }}
            >
              {item.image && (
                <img
                  src={item.image}
                  alt={item.title}
                  style={{
                    width: "32px",
                    height: "32px",
                    objectFit: "cover",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                />
              )}
              <span style={{ fontSize: "0.875rem" }}>{item.title}</span>
            </button>
          ))}
        </div>
      )}

      {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
        <div
          style={{
            padding: "0.5rem",
            fontSize: "0.875rem",
            color: "#666",
            fontStyle: "italic",
          }}
        >
          No products found
        </div>
      )}
    </div>
  );
}

