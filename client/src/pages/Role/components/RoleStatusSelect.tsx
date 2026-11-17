import type { FC } from "react";
import type { RoleStatus } from "../../../interfaces/RoleColumns";

interface RoleStatusSelectProps {
  value: RoleStatus;
  onChange: (value: RoleStatus) => void;
  errors?: string[];
  disabled?: boolean;
}

const RoleStatusSelect: FC<RoleStatusSelectProps> = ({
  value,
  onChange,
  errors,
  disabled,
}) => (
  <div>
    <label
      htmlFor="role-status"
      className="mb-1.5 block text-sm font-medium text-ink"
    >
      Status
    </label>
    <select
      id="role-status"
      name="status"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as RoleStatus)}
      className="w-full rounded-lg border border-line bg-surface px-3 py-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-page disabled:text-muted"
    >
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
    {errors?.[0] && <p className="mt-1 text-xs text-danger">{errors[0]}</p>}
  </div>
);

export default RoleStatusSelect;
