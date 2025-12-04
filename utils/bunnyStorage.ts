/**
 * Bunny CDN Storage Utility
 * Upload files to Bunny Storage and get CDN URLs
 */

// Bunny Storage Configuration
const BUNNY_STORAGE_ZONE = "webvideonhatbang";
const BUNNY_STORAGE_PASSWORD = "9307c7be-8614-44cc-b9ea1b68a7fd-a148-4bbc";
const BUNNY_STORAGE_HOSTNAME = "storage.bunnycdn.com";
const BUNNY_CDN_URL = "webxemvideo.b-cdn.net";

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload file to Bunny Storage
 * @param file - File to upload
 * @param path - Path in storage (e.g., "class-documents/classId/filename.pdf")
 * @returns Promise with upload result
 */
export const uploadToBunny = async (
  file: File,
  path: string
): Promise<UploadResult> => {
  try {
    // Validate environment variables
    if (!BUNNY_STORAGE_ZONE || !BUNNY_STORAGE_PASSWORD || !BUNNY_STORAGE_HOSTNAME) {
      return {
        success: false,
        error: "Bunny Storage chưa được cấu hình. Vui lòng liên hệ quản trị viên.",
      };
    }

    // Sanitize path (remove leading slash if exists)
    const sanitizedPath = path.startsWith("/") ? path.slice(1) : path;

    // Build upload URL
    const uploadUrl = `https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${sanitizedPath}`;

    // Upload file using PUT request
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        AccessKey: BUNNY_STORAGE_PASSWORD,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Bunny upload failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return {
        success: false,
        error: `Upload thất bại: ${response.status} - ${response.statusText}. ${errorText}`,
      };
    }

    // Build CDN URL
    const cdnUrl = `https://${BUNNY_CDN_URL}/${sanitizedPath}`;

    return {
      success: true,
      url: cdnUrl,
    };
  } catch (error: any) {
    console.error("❌ Bunny upload error:", error);
    return {
      success: false,
      error: `Lỗi kết nối: ${error.message || "Unknown error"}`,
    };
  }
};

/**
 * Delete file from Bunny Storage
 * @param path - Path in storage
 * @returns Promise with delete result
 */
export const deleteFromBunny = async (path: string): Promise<boolean> => {
  try {
    if (!BUNNY_STORAGE_ZONE || !BUNNY_STORAGE_PASSWORD || !BUNNY_STORAGE_HOSTNAME) {
      console.error("Bunny Storage credentials not configured");
      return false;
    }

    const sanitizedPath = path.startsWith("/") ? path.slice(1) : path;
    const deleteUrl = `https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${sanitizedPath}`;

    const response = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        AccessKey: BUNNY_STORAGE_PASSWORD,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Bunny delete error:", error);
    return false;
  }
};

/**
 * Generate a safe file path for storage
 * @param classId - Class ID
 * @param fileName - Original file name
 * @returns Safe path string
 */
export const generateFilePath = (classId: string, fileName: string): string => {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `class-documents/${classId}/${timestamp}_${sanitizedFileName}`;
};

/**
 * Test Bunny Storage connection
 * @returns Promise with test result
 */
export const testBunnyConnection = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    if (!BUNNY_STORAGE_ZONE || !BUNNY_STORAGE_PASSWORD || !BUNNY_STORAGE_HOSTNAME) {
      return {
        success: false,
        message: "Thiếu cấu hình Bunny Storage trong .env.local",
      };
    }

    // Try to list files (GET request to root)
    const testUrl = `https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}/`;
    
    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        AccessKey: BUNNY_STORAGE_PASSWORD,
      },
    });

    if (response.ok) {
      return {
        success: true,
        message: "Kết nối Bunny Storage thành công!",
      };
    } else {
      return {
        success: false,
        message: `Lỗi kết nối: ${response.status} - ${response.statusText}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Lỗi: ${error.message}`,
    };
  }
};
