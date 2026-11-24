import { useEffect, useState, type ReactNode } from "react";

import AxiosInstance from "../../../services/AxiosInstance";

// Loaded images are kept for the session so long dropdown lists don't refetch
const blobCache = new Map<string, string>();

interface OptionImageProps {
  // Login-protected API path, fetched with the current session
  protectedPath?: string | null;
  // Public image URL
  url?: string | null;
  alt: string;
  className?: string;
  // Shown when there is no image or it fails to load
  fallback: ReactNode;
}

const OptionImage = ({
  protectedPath,
  url,
  alt,
  className = "",
  fallback,
}: OptionImageProps) => {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);

    if (!protectedPath) {
      setSrc(url ?? null);
      return;
    }

    const cached = blobCache.get(protectedPath);

    if (cached) {
      setSrc(cached);
      return;
    }

    let active = true;

    AxiosInstance.get(protectedPath, { responseType: "blob" })
      .then((response) => {
        const objectUrl = URL.createObjectURL(response.data);
        blobCache.set(protectedPath, objectUrl);

        if (active) setSrc(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [protectedPath, url]);

  if (!src || failed) return <>{fallback}</>;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export default OptionImage;
