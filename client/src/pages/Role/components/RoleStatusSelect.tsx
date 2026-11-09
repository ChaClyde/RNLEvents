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
      className="mb-1.5 block text-sm font-medium text-[#003B5C]"
    >
      Status
    </label>
    <select
      id="role-status"
      name="status"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as RoleStatus)}
      className="w-full rounded-md border border-slate-900 bg-white px-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0095D9] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
    >
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
    {errors?.[0] && <p className="mt-1 text-xs text-red-600">{errors[0]}</p>}
  </div>
);

export default RoleStatusSelect;
