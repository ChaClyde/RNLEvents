import type { FC } from "react";

interface SubmitButtonProps {
  label: string;
  newClassName?: string;
  className?: string;
  loading?: boolean;
  loadingLabel?: string;
}

const SubmitButton: FC<SubmitButtonProps> = ({
  label,
  newClassName,
  className,
}) => {
  return (
    <>
      <button
        type="submit"
        className={`${
          newClassName
            ? `${newClassName} `
            : `px-4 py-3 rounded-lg bg-green-100 border border-green-400 text-sm font-medium text-green-600 hover:bg-green-200 shadow-lg
        ${className}`
        } `}
      >
        {label}
      </button>
    </>
  );
};

export default SubmitButton;
