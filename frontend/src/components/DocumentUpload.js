import React, { useState } from 'react';
import './DocumentUpload.css';

const DocumentUpload = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    setUploadStatus(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadStatus({ type: 'error', message: 'Please select files first' });
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('http://localhost:8000/upload-documents', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus({
          type: 'success',
          message: `Successfully uploaded ${data.files.length} file(s)`
        });
        setSelectedFiles([]);
      } else {
        setUploadStatus({
          type: 'error',
          message: data.message || 'Upload failed'
        });
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: `Upload failed: ${error.message}`
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="document-upload">
      <h3>Upload Learning Materials</h3>
      <p className="upload-description">
        Upload text files, documents, or learning materials to provide context for your conversations.
        The AI will use these materials to make conversations more relevant and personalized.
      </p>

      <div className="upload-container">
        <input
          type="file"
          id="file-input"
          multiple
          accept=".txt,.md,.doc,.docx"
          onChange={handleFileSelect}
          className="file-input"
        />
        <label htmlFor="file-input" className="file-label">
          📁 Choose Files
        </label>

        {selectedFiles.length > 0 && (
          <div className="selected-files">
            <h4>Selected Files:</h4>
            <ul>
              {selectedFiles.map((file, idx) => (
                <li key={idx}>
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          className="upload-button-main"
          onClick={handleUpload}
          disabled={uploading || selectedFiles.length === 0}
        >
          {uploading ? 'Uploading...' : 'Upload Documents'}
        </button>
      </div>

      {uploadStatus && (
        <div className={`upload-status ${uploadStatus.type}`}>
          {uploadStatus.message}
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
