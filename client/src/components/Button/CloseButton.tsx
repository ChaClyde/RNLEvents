import type { FC } from "react";

interface CloseButtonProps {
  label: string;
  onClose: () => void;
  newClassName?: string;
  className?: string;
}

const CloseButton: FC<CloseButtonProps> = ({
  label,
  onClose,
  newClassName,
  className,
}) => {
  return (
    <>
      <button
        type="submit"
        className={`
            ${
              newClassName
                ? newClassName
                : `px-4 py-3 rounded-lg bg-gray-100 border border-gray-400 text-sm font-medium text-gray-600 hover:bg-gray-200 shadow-lg
                ${className}`
            }`}
        onClick={onClose}
      >
        {label}
      </button>
    </>
  );
};

export default CloseButton;
