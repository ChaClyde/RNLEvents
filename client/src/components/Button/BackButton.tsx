import type { FC } from "react";
import { Link } from "react-router-dom";

interface BackButtonProps {
  label: string;
  path: string;
  newClassName?: string;
  className?: string;
}

const BackButton: FC<BackButtonProps> = ({
  label,
  path,
  newClassName,
  className,
}) => {
  return (
    <>
      <Link
        to={path}
        className={`${
          newClassName
            ? `${newClassName} `
            : `px-4 py-3 rounded-lg bg-gray-100 border border-gray-400 text-sm font-medium text-gray-600 hover:bg-gray-200 shadow-lg
        ${className}`
        } `}
      >
        {label}
      </Link>
    </>
  );
};

export default BackButton;
