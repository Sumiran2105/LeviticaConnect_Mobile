import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

const Motion = motion;
import {
  Clock,
  ChevronRight,
  Download,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Grid,
  List,
  LoaderCircle,
  MoreVertical,
  Search,
  Trash2,
  Inbox,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/layouts/admin-layout";
import { UserLayout } from "@/layouts/user-layout";
import {
  deleteFile,
  downloadFile,
  formatFileSize,
  listMyFiles,
  listReceivedFiles,
  listRecentFiles,
  listSharedFiles,
} from "@/lib/file-utils";
import { apiClient } from "@/lib/client";
import { formatISTDateTime, parsePlatformDate } from "@/lib/date-time";
import { useAuthStore } from "@/store/auth-store";

const categories = [
  { id: "recent", label: "Recent", icon: Clock },
  { id: "my-files", label: "My Files", icon: FolderOpen },
  { id: "shared", label: "Shared Files", icon: Users },
  { id: "received", label: "Received Files", icon: Inbox },
];

const fileCategoryLoaders = {
  recent: listRecentFiles,
  "my-files": listMyFiles,
  shared: listSharedFiles,
  received: listReceivedFiles,
};

const typeColors = {
  folder: { icon: FolderOpen, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-100" },
  pdf: { icon: FileText, color: "text-red-500", bg: "bg-red-50", border: "border-red-100" },
  doc: { icon: FileText, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
  sheet: { icon: FileSpreadsheet, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  image: { icon: FileImage, color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-100" },
  video: { icon: Video, color: "text-pink-500", bg: "bg-pink-50", border: "border-pink-100" },
  archive: { icon: FileArchive, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100" },
};

const toUserCamelCase = (str) => {
  if (!str) return "";
  const clean = str.replace(/[^a-zA-Z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

function getFileType(file) {
  const mimeType = String(file.type || "").toLowerCase();
  const extension = String(file.name || "").split(".").pop()?.toLowerCase() || "";

  if (mimeType.includes("image") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) return "image";
  if (mimeType.includes("video") || ["mp4", "mov", "webm", "mkv"].includes(extension)) return "video";
  if (mimeType.includes("spreadsheet") || ["xls", "xlsx", "csv"].includes(extension)) return "sheet";
  if (mimeType.includes("word") || ["doc", "docx"].includes(extension)) return "doc";
  if (mimeType.includes("pdf") || extension === "pdf") return "pdf";
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) return "archive";
  return "doc";
}

function getFileTimestamp(file) {
  const raw =
    file.raw?.created_at ||
    file.raw?.updated_at ||
    file.raw?.modified_at ||
    file.raw?.uploaded_at ||
    file.raw?.createdAt ||
    file.raw?.updatedAt ||
    "";
  const date = parsePlatformDate(raw);
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function formatModified(file) {
  const timestamp = getFileTimestamp(file);
  if (!timestamp) return "Recently";

  const diffMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))} mins ago`;
  if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))} hours ago`;
  if (diffMs < 2 * day) return "Yesterday";
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} days ago`;
  return formatISTDateTime(timestamp, { month: "short", day: "numeric" }, "Recently");
}

function openBlob(response, fallbackName) {
  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fallbackName || "download";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
}

function FileIcon({ type, size = "size-7" }) {
  const config = typeColors[type] || typeColors.doc;
  const Icon = config.icon;
  return (
    <div className={`flex items-center justify-center rounded-2xl ${config.bg} ${config.border} border p-3`}>
      <Icon className={`${size} ${config.color}`} />
    </div>
  );
}

function FileActionsMenu({ file, onDownload, onDelete, isDeleting }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="rounded-xl border border-brand-line bg-white/95 p-2 text-brand-secondary shadow-lg shadow-slate-900/10 backdrop-blur transition hover:border-brand-primary/30 hover:text-brand-primary"
        title="File actions"
        aria-label="File actions"
      >
        <MoreVertical className="size-4" />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-30 mt-2 w-36 overflow-hidden rounded-xl border border-brand-line bg-white py-1 shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDownload(file);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-brand-ink transition hover:bg-brand-soft hover:text-brand-primary"
          >
            <Download className="size-4" />
            {toUserCamelCase("download")}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => {
              setOpen(false);
              onDelete(file);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            {toUserCamelCase("delete")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FileImagePreview({ file, className }) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const session = useAuthStore((state) => state.session);
  const accessToken = session?.accessToken;

  useEffect(() => {
    let active = true;
    let objectUrl = null;

    async function fetchImage() {
      try {
        const url = file.downloadUrl;
        if (!url) {
          setError(true);
          setLoading(false);
          return;
        }

        const response = await apiClient.get(url, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          responseType: "blob",
        });

        if (active) {
          objectUrl = window.URL.createObjectURL(response.data);
          setSrc(objectUrl);
          setLoading(false);
        }
      } catch {
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    }

    fetchImage();

    return () => {
      active = false;
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file.downloadUrl, accessToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center size-full bg-brand-soft">
        <LoaderCircle className="size-5 animate-spin text-brand-primary/40" />
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className="flex items-center justify-center size-full bg-brand-soft">
        <FileIcon type={file.typeKey} size="size-7" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={file.name}
      className={className}
      loading="lazy"
    />
  );
}

export function FilesPage({ layout = "user" }) {
  const [activeCategory, setActiveCategory] = useState("recent");
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingFileId, setDeletingFileId] = useState(null);
  const Layout = layout === "admin" ? AdminLayout : UserLayout;
  const activeCategoryConfig = categories.find((category) => category.id === activeCategory) || categories[0];
  const activeCategoryLoader = fileCategoryLoaders[activeCategory] || listRecentFiles;

  const filesQuery = useQuery({
    queryKey: ["files-list", activeCategory],
    queryFn: activeCategoryLoader,
    staleTime: 30 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (file) => {
      setDeletingFileId(file.id);
      await deleteFile(file.id);
      return file.id;
    },
    onSuccess: () => {
      toast.success("File deleted.");
      filesQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || error.response?.data?.message || "Unable to delete file.");
    },
    onSettled: () => {
      setDeletingFileId(null);
    },
  });

  const files = useMemo(() => {
    return (filesQuery.data || [])
      .map((file) => ({
        ...file,
        typeKey: getFileType(file),
        modified: formatModified(file),
        modifiedAt: getFileTimestamp(file),
        sizeLabel: formatFileSize(file.size) || "--",
        owner: file.raw?.owner_name || file.raw?.uploaded_by_name || file.raw?.owner?.name || "You",
        ownerName:
          file.raw?.uploaded_by?.name ||
          file.raw?.shared_by?.name ||
          file.raw?.owner_name ||
          file.raw?.uploaded_by_name ||
          file.raw?.owner?.name ||
          "You",
      }))
      .sort((a, b) => b.modifiedAt - a.modifiedAt);
  }, [filesQuery.data]);

  const filteredFiles = files.filter((file) => {
    if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  async function handleDownload(file) {
    try {
      openBlob(await downloadFile(file.id), file.name);
    } catch (error) {
      toast.error(error.response?.data?.detail || error.response?.data?.message || "Unable to download file.");
    }
  }

  function handleDelete(file) {
    deleteMutation.mutate(file);
  }

  return (
    <Layout
      contentClassName="!p-0 h-full overflow-hidden"
      contentInnerClassName="!m-0 h-full !w-full !max-w-none"
      showFloatingActions={false}
    >
      <Motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f8fafc]"
      >
        <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-8 sm:py-10 lg:px-12 [scrollbar-width:thin]">
          <Motion.div
            variants={itemVariants}
            className="flex w-full flex-col gap-8"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex w-full items-center rounded-2xl border border-brand-line bg-white p-1.5 shadow-sm overflow-hidden">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`min-w-0 flex-1 flex items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] sm:text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                          : "text-brand-secondary hover:bg-brand-neutral hover:text-brand-ink"
                      }`}
                    >
                      <Icon className="size-3 shrink-0" />

                      <span className="truncate">
                        {toUserCamelCase(cat.label)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3">
                <div className="group relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-secondary transition-colors group-focus-within:text-brand-primary" />
                  <input
                    type="text"
                    placeholder="search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-brand-line bg-white py-2.5 pl-9 pr-4 text-xs shadow-sm transition-all placeholder:text-brand-secondary/40 focus:ring-2 focus:ring-brand-primary/20 sm:w-64 lowercase"
                  />
                </div>
                <div className="flex items-center rounded-xl border border-brand-line bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`rounded-lg p-2 transition-colors ${
                      viewMode === "grid"
                        ? "bg-brand-primary text-white shadow-sm"
                        : "text-brand-secondary hover:text-brand-ink"
                    }`}
                    title="Grid view"
                  >
                    <Grid className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`rounded-lg p-2 transition-colors ${
                      viewMode === "list"
                        ? "bg-brand-primary text-white shadow-sm"
                        : "text-brand-secondary hover:text-brand-ink"
                    }`}
                    title="List view"
                  >
                    <List className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="cursor-pointer text-brand-secondary transition-colors hover:text-brand-primary">
                {toUserCamelCase("my files")}
              </span>
              <ChevronRight className="size-4 text-brand-line" />
              <span className="text-brand-ink">
                {toUserCamelCase(activeCategoryConfig.label)}
              </span>
              <span className="ml-2 rounded-full bg-brand-neutral px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-secondary/50">
                {filteredFiles.length} {toUserCamelCase("items")}
              </span>
            </div>

            {filesQuery.isLoading ? (
              <div className="flex items-center justify-center py-32 text-brand-secondary text-sm font-bold">
                <LoaderCircle className="mr-2 size-5 animate-spin text-brand-primary" />
                {toUserCamelCase("loading files")}...
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-brand-soft">
                  <FolderOpen className="size-10 text-brand-primary" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-brand-ink">
                  No files found
                </h3>
                <p className="max-w-sm text-xs leading-6 text-brand-secondary/80">
                  There are no files matching your current search or category.
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <Motion.div
                variants={containerVariants}
                className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8"
              >
                {filteredFiles.map((file) => (
                  <Motion.div
                    variants={itemVariants}
                    key={file.id}
                    tabIndex={0}
                    className="group relative flex cursor-pointer flex-col gap-3 rounded-[24px] border border-brand-line bg-white p-4 transition-all duration-300 hover:border-brand-primary/40 hover:shadow-[0_8px_30px_rgba(68,83,74,0.10)] focus-visible:border-brand-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20"
                  >
                    <div className="absolute right-3 top-3 z-20 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <FileActionsMenu
                        file={file}
                        onDownload={handleDownload}
                        onDelete={handleDelete}
                        isDeleting={deletingFileId === file.id}
                      />
                    </div>

                    <div className="flex items-center justify-center pb-2 pt-2 h-28 w-full">
                      {file.typeKey === "image" ? (
                        <div className="relative h-full w-full overflow-hidden rounded-xl bg-brand-soft border border-brand-line/40 flex items-center justify-center">
                          <FileImagePreview
                            file={file}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                      ) : (
                        <FileIcon type={file.typeKey} size="size-9" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <h4 className="line-clamp-2 text-sm font-bold leading-snug text-brand-ink transition-colors group-hover:text-brand-primary">
                        {file.name}
                      </h4>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-brand-secondary">
                          {file.modified}
                        </p>
                        <p className="shrink-0 text-[10px] font-semibold text-brand-secondary">
                          {file.sizeLabel}
                        </p>
                      </div>
                    </div>
                  </Motion.div>
                ))}
              </Motion.div>
            ) : (
              <Motion.div
                variants={itemVariants}
                className="overflow-hidden rounded-[24px] border border-brand-line bg-white shadow-sm"
              >
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-brand-line bg-brand-neutral">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-brand-secondary">
                        {toUserCamelCase("name")}
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-brand-secondary">
                        {toUserCamelCase("owner")}
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-brand-secondary">
                        {toUserCamelCase("modified")}
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-brand-secondary">
                        {toUserCamelCase("size")}
                      </th>
                      <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-brand-secondary">
                        {toUserCamelCase("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-line/50">
                    {filteredFiles.map((file) => (
                      <tr
                        key={file.id}
                        className="group cursor-pointer transition-colors hover:bg-brand-soft/30"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {file.typeKey === "image" ? (
                              <div className="relative size-10 overflow-hidden rounded-lg bg-brand-soft border border-brand-line/40 flex items-center justify-center shrink-0">
                                <FileImagePreview
                                  file={file}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <FileIcon type={file.typeKey} size="size-5" />
                            )}
                            <span className="font-semibold text-brand-ink transition-colors group-hover:text-brand-primary">
                              {file.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-brand-secondary">
                          {file.ownerName}
                        </td>
                        <td className="px-6 py-4 text-brand-secondary">
                          {file.modified}
                        </td>
                        <td className="px-6 py-4 text-brand-secondary">
                          {file.sizeLabel}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
                            <FileActionsMenu
                              file={file}
                              onDownload={handleDownload}
                              onDelete={handleDelete}
                              isDeleting={deletingFileId === file.id}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Motion.div>
            )}
          </Motion.div>
        </div>
      </Motion.div>
    </Layout>
  );
}
