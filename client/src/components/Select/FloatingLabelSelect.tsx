import type { ChangeEvent, FC, ReactNode } from "react";

interface FloatingLabelSelectProps {
  label: string;
  newSelectClassName?: string;
  selectClassName?: string;
  newLabelClassName?: string;
  labelClassName?: string;
  name?: string;
  value?: string | any;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  autofocus?: boolean;
  disabled?: boolean;
  errors?: string[];
  children?: ReactNode;
}

const FloatingLabelSelect: FC<FloatingLabelSelectProps> = ({
  label,
  newSelectClassName,
  selectClassName,
  newLabelClassName,
  labelClassName,
  name,
  value,
  onChange,
  required,
  autofocus,
  disabled,
  errors,
  children,
}) => {
  return (
    <>
      <div className="relative">
        <select
          name={name}
          id={name}
          value={value}
          onChange={onChange}
          className={`${
            newSelectClassName
              ? newSelectClassName
              : `block px-2.5 pb-2.5 pt-4 w-full text-sm text-heading bg-transparent rounded-base border border-default-medium appearance-none focus:border-blue-400 focus:shadow-[0_0_10px_rgba(59,130,246,0.6)] focus:ring-0 peer 
                    ${selectClassName}`
          }`}
          required={required}
          autoFocus={autofocus}
          disabled={disabled}
        >
          {children}
        </select>

        <label
          htmlFor={name}
          className={
            newLabelClassName
              ? newLabelClassName
              : `absolute text-sm text-body duration-300 transform bg-white -translate-y-4 scale-75 top-2 z-10 origin-left px-2 peer-focus:px-2 peer-focus:text-fg-brand peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto inset-s-1 
              ${labelClassName}`
          }
        >
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>

        {errors && errors.length > 0 && (
          <span className="text-red-600 dark:text-red-500 text-xs mt-1 block">
            {errors[0]}
          </span>
        )}
      </div>
    </>
  );
};

export default FloatingLabelSelect;
