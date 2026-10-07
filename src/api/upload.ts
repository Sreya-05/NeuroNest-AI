const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export interface UploadResponse {
  status: string;
  modality: string;
  original_filename: string;
  saved_filename: string;
  saved_path: string;
}

export async function uploadFile(endpoint: string, file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = `Upload failed (HTTP ${response.status})`;
    try {
      const data = await response.json();
      if (data && typeof data === "object" && "detail" in data && typeof data.detail === "string") {
        message = data.detail;
      }
    } catch {
      /* use default message */
    }
    throw new Error(message);
  }

  return response.json();
}
