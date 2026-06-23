import { useState } from "react";
import { useAuth } from "./use-auth";

export interface UploadResult {
  url: string;
  name: string;
}

export function useUpload() {
  const { token } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (file: File): Promise<UploadResult> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? "Upload failed");
      }
      return (await res.json()) as UploadResult;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading };
}
