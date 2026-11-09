import type { FC } from "react";

interface CloseButtonProps {
  label: string;
  onClose: () => void;
  newClassName?: string;
  className?: string;
  disabled?: boolean;
}

const CloseButton: FC<CloseButtonProps> = ({
  label,
  onClose,
  newClassName,
  className,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClose}
      disabled={disabled}
      className={
        newClassName
          ? newClassName
          : `px-4 py-3 rounded-lg bg-gray-100 border border-gray-400 text-sm font-medium text-gray-600 hover:bg-gray-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${className ?? ""}`
      }
    >
      {label}
    </button>
  );
};

export default CloseButton;
