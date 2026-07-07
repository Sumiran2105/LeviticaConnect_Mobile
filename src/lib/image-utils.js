import { useEffect, useMemo, useState } from "react";

const DEFAULT_API_BASE_URL = "https://collabration-teams-zrhv.onrender.com";

const getApiBaseUrl = () => {
  const value = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
  const trimmedValue = String(value).replace(/\/$/, "");

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return trimmedValue.startsWith("/") ? trimmedValue : `/${trimmedValue}`;
};

const normalizeImagePath = (path) => {
  if (!path || typeof path !== "string") return "";

  const value = path.trim();

  if (!value) return "";
  return value;
};

const stripBackendPrefix = (path) => path.replace(/^\/backend(?=\/|$)/, "") || "/";

const verifiedImageCache = new Map();

function canLoadImage(url) {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") {
      resolve(false);
      return;
    }

    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
  });
}

const encodePathSegments = (path) =>
  path
    .split("/")
    .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
    .join("/");

export const getImageUrl = (path) => {
  const value = normalizeImagePath(path);

  if (!value) return "";

  if (
    value.startsWith("http") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  if (value.startsWith("//")) {
    return `${window.location.protocol}${value}`;
  }

  const cleanBaseUrl = getApiBaseUrl().replace(/\/$/, "");
  let cleanPath = stripBackendPrefix(value.startsWith("/") ? value : `/${value}`);

  const publicRoots = ["/media", "/uploads", "/static", "/storage", "/assets", "/files"];
  const hasPublicRoot = publicRoots.some((root) => cleanPath.startsWith(root));
  const mediaRelativeRoots = [
    "/profiles",
    "/profile-images",
    "/profile_images",
    "/avatars",
    "/images",
    "/company",
    "/company-logos",
    "/company_logos",
    "/logos",
  ];
  const hasMediaRelativeRoot = mediaRelativeRoots.some((root) => cleanPath.startsWith(root));

  if (!hasPublicRoot && (hasMediaRelativeRoot || !cleanPath.slice(1).includes("/"))) {
    cleanPath = `/media${cleanPath}`;
  }

  return `${cleanBaseUrl}${encodePathSegments(cleanPath)}`;
};

export const getImageUrlCandidates = (path) => {
  const value = normalizeImagePath(path);

  if (!value) return [];

  if (
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return [value];
  }

  const cleanBaseUrl = getApiBaseUrl().replace(/\/$/, "");

  if (value.startsWith("http") || value.startsWith("//")) {
    const originalUrl = getImageUrl(value);

    try {
      const parsedUrl = new URL(originalUrl, window.location.origin);
      const mediaPath = stripBackendPrefix(parsedUrl.pathname);

      if (mediaPath.startsWith("/media/")) {
        return Array.from(
          new Set([
            `${cleanBaseUrl}${encodePathSegments(mediaPath)}`,
            originalUrl,
          ])
        );
      }
    } catch {
      return [originalUrl];
    }

    return [originalUrl];
  }

  const cleanPath = stripBackendPrefix(value.startsWith("/") ? value : `/${value}`);
  const canonicalUrl = getImageUrl(value);
  const candidates = [canonicalUrl];

  if (cleanPath.startsWith("/media/")) {
    candidates.push(`${cleanBaseUrl}${encodePathSegments(cleanPath)}`);
  } else if (
    cleanPath.startsWith("/profiles/") ||
    cleanPath.startsWith("/company/") ||
    cleanPath.startsWith("/company-logos/") ||
    cleanPath.startsWith("/company_logos/") ||
    cleanPath.startsWith("/logos/")
  ) {
    candidates.push(`${cleanBaseUrl}${encodePathSegments(`/media${cleanPath}`)}`);
  }

  return Array.from(new Set(candidates));
};

export const getProfileImageSource = (profile) => {
  if (!profile || typeof profile !== "object") return "";

  return (
    profile.profile_image_url ||
    profile.profile_image ||
    (typeof profile.profile === "string" ? profile.profile : "") ||
    profile.profilePicture ||
    profile.profile_picture ||
    profile.profilePic ||
    profile.profile_pic ||
    profile.picture_url ||
    profile.picture ||
    profile.photo_url ||
    profile.photo ||
    profile.avatar_url ||
    profile.avatar ||
    profile.image_url ||
    profile.image ||
    profile.user?.profile_image_url ||
    profile.user?.profile_image ||
    (typeof profile.user?.profile === "string" ? profile.user.profile : "") ||
    profile.user?.profile_picture ||
    profile.user?.avatar_url ||
    profile.user?.image_url ||
    profile.user?.image ||
    ""
  );
};

export const getCompanyLogoSource = (company) => {
  if (!company || typeof company !== "object") return "";

  return (
    company.logo_url ||
    company.company_logo_url ||
    company.logo ||
    company.company_logo ||
    company.image_url ||
    company.image ||
    company.company?.logo_url ||
    company.company?.company_logo_url ||
    company.company?.logo ||
    company.company?.company_logo ||
    ""
  );
};

export const isTransientImageSource = (path) =>
  typeof path === "string" && (path.startsWith("data:") || path.startsWith("blob:"));

export const getPersistableProfileImageSource = (profile) => {
  const image = getProfileImageSource(profile);
  return isTransientImageSource(image) ? "" : image;
};

export const getVersionedImageUrl = (path, version) => {
  const url = getImageUrl(path);
  if (!url || !version || url.startsWith("data:") || url.startsWith("blob:")) return url;

  return `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
};

export const getVersionedImageUrlCandidates = (path, version) =>
  getImageUrlCandidates(path).map((url) => {
    if (!url || !version || url.startsWith("data:") || url.startsWith("blob:")) return url;
    return `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
  });

export function useVerifiedImageUrl(urls = []) {
  const candidates = useMemo(() => urls.filter(Boolean), [urls]);
  const transientCandidate = candidates.find((candidate) =>
    candidate.startsWith("data:") || candidate.startsWith("blob:")
  );
  const cacheKey = candidates.join("|");
  const cachedUrl = cacheKey ? verifiedImageCache.get(cacheKey) : undefined;
  const [verified, setVerified] = useState({ cacheKey: "", url: "" });

  useEffect(() => {
    if (!cacheKey || transientCandidate || cachedUrl !== undefined) {
      return undefined;
    }

    let isMounted = true;
    const candidatesToVerify = cacheKey.split("|");

    async function verifyCandidates() {
      for (const candidate of candidatesToVerify) {
        const loaded = await canLoadImage(candidate);

        if (!isMounted) return;

        if (loaded) {
          verifiedImageCache.set(cacheKey, candidate);
          setVerified({ cacheKey, url: candidate });
          return;
        }
      }

      verifiedImageCache.set(cacheKey, "");
      if (isMounted) setVerified({ cacheKey, url: "" });
    }

    verifyCandidates();

    return () => {
      isMounted = false;
    };
  }, [cacheKey, cachedUrl, transientCandidate]);

  if (transientCandidate) return transientCandidate;
  if (!cacheKey) return "";
  if (cachedUrl !== undefined) return cachedUrl;
  return verified.cacheKey === cacheKey ? verified.url : "";
}
