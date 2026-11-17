import { useEffect, useId, type FC, type ReactNode } from "react";

interface RoleModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  busy?: boolean;
  tone?: "default" | "danger";
  children: ReactNode;
}

const TONES = {
  default: {
    border: "border-line",
    bar: "bg-primary",
    divider: "border-line",
    title: "text-ink",
  },
  danger: {
    border: "border-danger/20",
    bar: "bg-danger",
    divider: "border-line",
    title: "text-danger",
  },
};

const RoleModalShell: FC<RoleModalShellProps> = ({
  isOpen,
  onClose,
  title,
  description,
  busy = false,
  tone = "default",
  children,
}) => {
  const titleId = useId();
  const styles = TONES[tone];

  // Escape closes the modal, except while a request is running
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, busy, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={() => !busy && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative w-full max-w-lg overflow-hidden rounded-xl border bg-surface shadow-lg ${styles.border}`}
      >
        <div className={`h-1 ${styles.bar}`} />

        <div
          className={`flex items-start justify-between gap-4 border-b px-6 py-4 ${styles.divider}`}
        >
          <div>
            <h3
              id={titleId}
              className={`text-base font-semibold ${styles.title}`}
            >
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-xs text-muted">{description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted transition hover:bg-page hover:text-ink disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6l12 12M18 6L6 18"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  );
};

export default RoleModalShell;
