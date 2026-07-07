import { Download, Eye, FileText, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  downloadFile,
  formatFileSize,
  getApiUrl,
  getFile,
  previewFile,
} from "@/lib/file-utils";

function openBlob(response, fallbackName, mode = "preview") {
  const blobUrl = window.URL.createObjectURL(response.data);

  if (mode === "download") {
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fallbackName || "download";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    return;
  }

  window.open(blobUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60 * 1000);
}

function resolvePreviewUrl(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("blob:")) {
    return value;
  }

  if (value.startsWith("/")) {
    return getApiUrl(value);
  }

  return "";
}

export function FileAttachmentCard({ attachment, isMe = false, isSharedFile = false }) {
  const [busyAction, setBusyAction] = useState("");

  if (!attachment?.id) {
    return null;
  }

  const fileSize = formatFileSize(attachment.size);

  async function handlePreview() {
    try {
      setBusyAction("preview");
      const [fileRecord, previewResponse] = await Promise.all([
        getFile(attachment.id),
        previewFile(attachment.id),
      ]);
      const previewUrl = resolvePreviewUrl(previewResponse?.url || fileRecord?.url || fileRecord?.path);

      if (previewUrl) {
        window.open(previewUrl, "_blank", "noopener,noreferrer");
        return;
      }

      openBlob(await downloadFile(attachment.id), attachment.name, "preview");
    } catch (error) {
      toast.error(error.response?.data?.detail || error.response?.data?.message || "Unable to preview this file.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleDownload() {
    try {
      setBusyAction("download");
      openBlob(await downloadFile(attachment.id), attachment.name, "download");
    } catch (error) {
      const previewUrl = resolvePreviewUrl(attachment.url);

      if (previewUrl) {
        window.open(previewUrl, "_blank", "noopener,noreferrer");
        return;
      }

      toast.error(error.response?.data?.detail || error.response?.data?.message || "Unable to download this file.");
    } finally {
      setBusyAction("");
    }
  }

  return (
    <div
  className={`mt-2 flex ${
    isSharedFile
      ? "w-full"
      : "w-[220px] sm:w-full"
  } max-w-full min-w-0 flex-row gap-3 rounded-2xl border px-3 py-2.5 shadow-sm ${
    isMe
      ? "border-white/25 bg-white/15 text-white"
      : "border-gray-200 bg-white text-gray-900"
  }`}
>
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
          isMe ? "bg-white/20 text-white" : "bg-brand-soft text-brand-primary"
        }`}
      >
        <FileText className="size-5" />
      </div>
      <button type="button" onClick={handlePreview} className="min-w-0 flex-1 max-w-full text-left">
        <p className="truncate text-xs sm:text-sm font-semibold">{attachment.name}</p>
        <p className={`truncate text-xs ${isMe ? "text-white/70" : "text-gray-500"}`}>
          {fileSize || attachment.type || "File attachment"}
        </p>
      </button>
      <div className="flex flex-wrap shrink-0 items-center gap-1 sm:flex-nowrap">
        <button
          type="button"
          onClick={handlePreview}
          disabled={Boolean(busyAction)}
          className={`rounded-lg p-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${
            isMe ? "hover:bg-white/20" : "text-gray-600 hover:bg-gray-100 hover:text-brand-primary"
          }`}
          title="Preview file"
        >
          {busyAction === "preview" ? <LoaderCircle className="size-4 animate-spin" /> : <Eye className="size-4" />}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={Boolean(busyAction)}
          className={`rounded-lg p-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${
            isMe ? "hover:bg-white/20" : "text-gray-600 hover:bg-gray-100 hover:text-brand-primary"
          }`}
          title="Download file"
        >
          {busyAction === "download" ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
        </button>
      </div>
    </div>
  );
}
