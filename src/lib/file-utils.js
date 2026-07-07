import {
  FILE_DELETE,
  FILE_DOWNLOAD,
  FILE_BULK_UPLOAD,
  FILE_GET,
  FILE_PREVIEW,
  FILES_CHANNEL,
  FILES_LIST,
  FILES_MY_FILES,
  FILES_RECEIVED,
  FILES_RECENT,
  FILES_SHARED,
} from "@/config/api";
import { apiClient } from "@/lib/client";

export function getApiUrl(path) {
  const baseUrl = apiClient.defaults.baseURL || "";

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${baseUrl}${path}`;
}

export function getFileId(file) {
  return (
    file?.id ||
    file?.file_id ||
    file?.uuid ||
    file?.file?.id ||
    file?.file?.file_id ||
    null
  );
}

export function getFileName(file) {
  return (
    file?.name ||
    file?.filename ||
    file?.file_name ||
    file?.fileName ||
    file?.original_filename ||
    file?.original_name ||
    file?.url?.split("/")?.pop() ||
    file?.path?.split("/")?.pop() ||
    file?.file?.name ||
    file?.file?.filename ||
    "Attachment"
  );
}

export function getFileType(file) {
  return file?.content_type || file?.mime_type || file?.mimeType || file?.type || file?.file?.content_type || "";
}

export function getFileSize(file) {
  return file?.size || file?.file_size || file?.bytes || file?.file?.size || null;
}

export function formatFileSize(size) {
  const bytes = Number(size);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function normalizeFileRecord(file) {
  const fileId = getFileId(file);

  if (!fileId) {
    return null;
  }

  return {
    id: fileId,
    name: getFileName(file),
    type: getFileType(file),
    size: getFileSize(file),
    url: file?.url || file?.path || file?.file_url || file?.file?.url || file?.file?.path || "",
    raw: file,
    getUrl: getApiUrl(FILE_GET(fileId)),
    previewUrl: getApiUrl(FILE_PREVIEW(fileId)),
    downloadUrl: getApiUrl(FILE_DOWNLOAD(fileId)),
  };
}

export function normalizeFileResponse(data) {
  return (
    normalizeFileRecord(data?.file) ||
    normalizeFileRecord(data?.data) ||
    normalizeFileRecord(data?.attachment) ||
    normalizeFileRecord(data)
  );
}

export function normalizeFileCollection(data) {
  const candidates =
    data?.files ||
    data?.uploaded_files ||
    data?.data ||
    data?.items ||
    data?.results ||
    data;

  return (Array.isArray(candidates) ? candidates : [])
    .map(normalizeFileRecord)
    .filter(Boolean);
}

export async function listFiles() {
  const response = await apiClient.get(FILES_LIST);
  return normalizeFileCollection(response.data);
}

export async function listRecentFiles() {
  const response = await apiClient.get(FILES_RECENT);
  return normalizeFileCollection(response.data);
}

export async function listMyFiles() {
  const response = await apiClient.get(FILES_MY_FILES);
  return normalizeFileCollection(response.data);
}

export async function listSharedFiles() {
  const response = await apiClient.get(FILES_SHARED);
  return normalizeFileCollection(response.data);
}

export async function listReceivedFiles() {
  const response = await apiClient.get(FILES_RECEIVED);
  return normalizeFileCollection(response.data);
}

export async function listChannelFiles(channelId) {
  if (!channelId) return [];

  const response = await apiClient.get(FILES_CHANNEL(channelId));
  return normalizeFileCollection(response.data);
}

export async function uploadFiles({ files, file, accessToken }) {
  const selectedFiles = Array.isArray(files) ? files : Array.from(files || (file ? [file] : []));

  if (!selectedFiles.length) {
    throw new Error("Select at least one file to upload.");
  }

  const formData = new FormData();
  selectedFiles.forEach((selectedFile) => {
    formData.append("files", selectedFile);
  });

  const uploadResponse = await apiClient.post(FILE_BULK_UPLOAD, formData, {
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      "Content-Type": "multipart/form-data",
    },
  });

  const uploadedFiles = normalizeFileCollection(uploadResponse.data);

  if (!uploadedFiles.length) {
    const attachment = normalizeFileResponse(uploadResponse.data);
    if (attachment) {
      uploadedFiles.push(attachment);
    }
  }

  if (!uploadedFiles.length) {
    throw new Error("The upload completed, but no file ids were returned.");
  }

  return uploadedFiles;
}

export async function uploadFile({ file, accessToken }) {
  const attachments = await uploadFiles({ files: [file], accessToken });
  return attachments[0];
}

export async function getFile(fileId) {
  const response = await apiClient.get(FILE_GET(fileId));
  return normalizeFileResponse(response.data) || response.data;
}

export async function previewFile(fileId) {
  const response = await apiClient.get(FILE_PREVIEW(fileId));
  return response.data;
}

export async function downloadFile(fileId) {
  return apiClient.get(FILE_DOWNLOAD(fileId), { responseType: "blob" });
}

export async function deleteFile(fileId) {
  const response = await apiClient.delete(FILE_DELETE(fileId));
  return response.data;
}

export function normalizeMessageAttachments(message) {
  const withMessageFallback = (file) => {
    if (!file || typeof file !== "object") {
      return file;
    }

    return {
      name: message?.content || message?.message || message?.text,
      size: message?.file_size,
      ...file,
    };
  };

  const candidates = [
    ...(Array.isArray(message?.attachments) ? message.attachments : []),
    ...(Array.isArray(message?.files) ? message.files.map(withMessageFallback) : []),
    message?.attachment,
    message?.file,
    message?.file_id
      ? {
          id: message.file_id,
          name: message.file_name || message.filename || message.content,
          type: message.content_type,
          size: message.file_size,
        }
      : null,
  ].filter(Boolean);

  return candidates.map(normalizeFileRecord).filter(Boolean);
}
