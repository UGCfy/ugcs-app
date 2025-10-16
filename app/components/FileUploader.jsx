// app/components/FileUploader.jsx
// Drag & drop file upload component
import { useState } from "react";

export default function FileUploader({ onUploadComplete, maxFiles = 10 }) {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    // Filter for images and videos only
    const validFiles = files.filter((file) => {
      return file.type.startsWith("image/") || file.type.startsWith("video/");
    });

    if (validFiles.length === 0) {
      alert("Please select image or video files only");
      return;
    }

    if (validFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files at a time`);
      return;
    }

    // Create previews
    const newPreviews = validFiles.map((file) => {
      const url = URL.createObjectURL(file);
      return {
        file,
        url,
        name: file.name,
        type: file.type,
        size: file.size,
      };
    });

    setPreviews(newPreviews);
  };

  const removePreview = (index) => {
    setPreviews((prev) => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index].url);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  const uploadFiles = async () => {
    if (previews.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      previews.forEach((preview) => {
        formData.append("files", preview.file);
      });

      const response = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const result = await response.json();

      if (result.error) {
        alert(`Upload failed: ${result.error}`);
        return;
      }

      // Clear previews
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
      setPreviews([]);
      setUploadProgress(100);

      // Notify parent
      if (onUploadComplete) {
        onUploadComplete(result);
      }

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div style={{ marginBottom: "2rem" }}>
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? "#16acf1" : "#ccc"}`,
          borderRadius: "8px",
          padding: "2rem",
          textAlign: "center",
          background: isDragging ? "#e3f2fd" : "#f9f9f9",
          transition: "all 0.3s ease",
          cursor: "pointer",
        }}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
          {isDragging ? "📥" : "☁️"}
        </div>
        <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", color: "#333" }}>
          {isDragging ? "Drop files here" : "Drag & drop files here"}
        </h3>
        <p style={{ margin: "0 0 1rem 0", color: "#666", fontSize: "0.9rem" }}>
          or click to browse
        </p>
        <p style={{ margin: 0, color: "#999", fontSize: "0.8rem" }}>
          Supports: Images (JPG, PNG, GIF, WebP) and Videos (MP4, WebM, MOV)
        </p>
        <p style={{ margin: "0.25rem 0 0", color: "#999", fontSize: "0.8rem" }}>
          Maximum {maxFiles} files at a time
        </p>

        <input
          id="file-input"
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
      </div>

      {/* Preview Section */}
      {previews.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem" }}>
            Ready to upload ({previews.length} {previews.length === 1 ? "file" : "files"})
          </h4>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            {previews.map((preview, index) => (
              <div
                key={index}
                style={{
                  position: "relative",
                  background: "#fff",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  overflow: "hidden",
                  paddingBottom: "100%",
                }}
              >
                {preview.type.startsWith("image/") ? (
                  <img
                    src={preview.url}
                    alt={preview.name}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#000",
                      color: "white",
                      fontSize: "3rem",
                    }}
                  >
                    🎬
                  </div>
                )}

                {/* File info overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
                    padding: "1.5rem 0.5rem 0.5rem",
                    color: "white",
                    fontSize: "0.7rem",
                  }}
                >
                  <div style={{ fontWeight: "500", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {preview.name.length > 18 ? preview.name.substring(0, 15) + "..." : preview.name}
                  </div>
                  <div style={{ fontSize: "0.65rem", opacity: 0.8 }}>
                    {formatFileSize(preview.size)}
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePreview(index);
                  }}
                  style={{
                    position: "absolute",
                    top: "6px",
                    right: "6px",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "rgba(220, 53, 69, 0.9)",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                  }}
                  title="Remove"
                >
                  ×
                </button>

                {/* Type badge */}
                <div
                  style={{
                    position: "absolute",
                    top: "6px",
                    left: "6px",
                    padding: "3px 8px",
                    background: preview.type.startsWith("video/") ? "rgba(220, 53, 69, 0.9)" : "rgba(0, 128, 96, 0.9)",
                    color: "white",
                    borderRadius: "4px",
                    fontSize: "0.65rem",
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  {preview.type.startsWith("video/") ? "Video" : "Image"}
                </div>
              </div>
            ))}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.85rem" }}>
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  background: "#e0e0e0",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${uploadProgress}%`,
                    height: "100%",
                    background: "#16acf1",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={uploadFiles}
              disabled={isUploading}
              style={{
                padding: "0.75rem 2rem",
                background: isUploading ? "#ccc" : "#008060",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: isUploading ? "not-allowed" : "pointer",
                fontWeight: "600",
                fontSize: "0.95rem",
              }}
            >
              {isUploading ? "Uploading..." : `Upload ${previews.length} ${previews.length === 1 ? "File" : "Files"}`}
            </button>
            
            <button
              onClick={() => {
                previews.forEach((p) => URL.revokeObjectURL(p.url));
                setPreviews([]);
              }}
              disabled={isUploading}
              style={{
                padding: "0.75rem 1.5rem",
                background: "white",
                color: "#666",
                border: "1px solid #ccc",
                borderRadius: "6px",
                cursor: isUploading ? "not-allowed" : "pointer",
                fontWeight: "500",
              }}
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

