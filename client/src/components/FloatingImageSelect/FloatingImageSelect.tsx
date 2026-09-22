import { useEffect, useRef, useState, type FC } from "react";
import { ImageOff } from "lucide-react";

export interface FloatingImageOption {
  id: number | string;
  image: string;
  title: string;
  description?: string | null;
  meta?: { label: string; value: string }[];
}

interface FloatingImageSelectProps {
  label: string;
  options: FloatingImageOption[];
  value: number | string | null;
  onChange: (id: number | string) => void;
  required?: boolean;
  errors?: string[];
  placeholder?: string;
  loading?: boolean;
}

const SmartImage: FC<{
  src: string;
  alt: string;
  className: string;
  iconSize: number;
}> = ({ src, alt, className, iconSize }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-slate-100 text-slate-300`}
      >
        <ImageOff size={iconSize} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
};

const FloatingImageSelect: FC<FloatingImageSelectProps> = ({
  label,
  options,
  value,
  onChange,
  required,
  errors,
  placeholder = "Select an option",
  loading = false,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.id === value) ?? null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: number | string) => {
    onChange(id);
    setIsPickerOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <div className="relative">
        <span className="absolute -top-2 left-3 z-10 bg-white px-1 text-xs font-medium text-slate-600">
          {label} {required && <span className="text-red-500">*</span>}
        </span>

        <div
          className={`flex min-h-16 items-center justify-between gap-3 rounded-lg border-2 p-3 transition ${
            errors?.length
              ? "border-red-400"
              : isPickerOpen
                ? "border-[#0095D9]"
                : "border-slate-300"
          }`}
        >
          {selected ? (
            <div className="flex flex-1 items-center gap-3">
              <button
                type="button"
                onClick={() => setIsDetailsOpen(true)}
                className="h-12 w-12 shrink-0 overflow-hidden rounded-md ring-1 ring-slate-200 transition hover:ring-2 hover:ring-[#0095D9]"
                title="View details"
              >
                <SmartImage
                  src={selected.image}
                  alt={selected.title}
                  className="h-full w-full object-cover"
                  iconSize={18}
                />
              </button>

              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold text-[#003B5C]">
                  {selected.title}
                </p>
                {selected.meta && selected.meta.length > 0 && (
                  <p className="truncate text-xs text-slate-500">
                    {selected.meta
                      .map((m) => `${m.label}: ${m.value}`)
                      .join(" \u00b7 ")}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsPickerOpen((prev) => !prev)}
                className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsPickerOpen((prev) => !prev)}
              className="flex-1 text-left text-sm text-slate-400"
            >
              {loading ? "Loading options..." : placeholder}
            </button>
          )}
        </div>

        {isPickerOpen && (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-auto rounded-lg border border-[#0095D9]/20 bg-white p-3 shadow-xl">
            {options.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                No options available.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option.id)}
                    className={`group flex flex-col overflow-hidden rounded-lg border text-left transition ${
                      option.id === value
                        ? "border-[#0095D9] ring-2 ring-[#0095D9]/40"
                        : "border-slate-200 hover:border-[#0095D9]/50"
                    }`}
                  >
                    <div className="aspect-square w-full overflow-hidden bg-slate-100">
                      <SmartImage
                        src={option.image}
                        alt={option.title}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                        iconSize={22}
                      />
                    </div>
                    <span className="truncate px-2 py-1.5 text-xs font-medium text-[#003B5C]">
                      {option.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {errors?.length ? (
        <p className="text-xs text-red-500">{errors[0]}</p>
      ) : null}

      {isDetailsOpen && selected && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsDetailsOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SmartImage
              src={selected.image}
              alt={selected.title}
              className="h-56 w-full object-cover"
              iconSize={40}
            />

            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-[#003B5C]">
                  {selected.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsDetailsOpen(false)}
                  className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  &#10005;
                </button>
              </div>

              {selected.description && (
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {selected.description}
                </p>
              )}

              {selected.meta && selected.meta.length > 0 && (
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  {selected.meta.map((m) => (
                    <div key={m.label}>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">
                        {m.label}
                      </dt>
                      <dd className="text-sm font-medium text-[#003B5C]">
                        {m.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingImageSelect;
