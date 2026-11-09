import { useState } from "react";
import { AlertTriangle, Building2, Users, X } from "lucide-react";
import type { AxiosError } from "axios";

import OfficeService from "../../../services/OfficeService";
import type { OfficeColumns } from "../../../interfaces/OfficeColumns";

import CloseButton from "../../../components/Button/CloseButton";

interface DeleteOfficeModalProps {
  office: OfficeColumns | null;
  onClose: () => void;
  onOfficeDeleted: () => void;
}

const DeleteOfficeModal = ({
  office,
  onClose,
  onOfficeDeleted,
}: DeleteOfficeModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!office) return null;

  const hasUsers = office.users_count > 0;

  const handleDelete = async () => {
    if (hasUsers || isDeleting) return;

    try {
      setIsDeleting(true);
      setErrorMessage("");

      const response = await OfficeService.destroyOffice(office.office_id);

      if (response.status === 200) {
        onOfficeDeleted();
        onClose();
      }
    } catch (error) {
      const axiosError = error as AxiosError<{
        message?: string;
        errors?: Record<string, string[]>;
      }>;

      setErrorMessage(
        axiosError.response?.data?.message ||
          "Unable to delete this office. Please try again.",
      );

      console.error("Error deleting office:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={isDeleting ? undefined : onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <AlertTriangle size={21} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Move Office to Trash
              </h2>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Confirm before proceeding
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-6">
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            Are you sure you want to move this office to the Trash Bin? You can
            restore it later if needed.
          </p>

          {/* Office Details */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0095D9]/10 text-[#0095D9]">
                <Building2 size={20} />
              </div>

              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {office.office_name}
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {office.office_code}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 dark:text-gray-400">
                  Office Type
                </span>

                <span className="text-right text-gray-800 dark:text-gray-200">
                  {office.office_type || "Not specified"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500 dark:text-gray-400">
                  Assigned Users
                </span>

                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {office.users_count}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500 dark:text-gray-400">Status</span>

                <span className="capitalize text-gray-800 dark:text-gray-200">
                  {office.status}
                </span>
              </div>
            </div>

            {office.description && (
              <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-700">
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Description
                </p>

                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {office.description}
                </p>
              </div>
            )}
          </div>

          {/* Assigned Users Warning */}
          {hasUsers && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
              <Users
                size={19}
                className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
              />

              <p className="text-sm text-amber-800 dark:text-amber-300">
                This office currently has {office.users_count} assigned user(s).
                Reassign or remove those users before moving this office to
                Trash.
              </p>
            </div>
          )}

          {/* Backend Error */}
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800/50 sm:flex-row sm:justify-end">
          <CloseButton label="Cancel" onClose={onClose} disabled={isDeleting} />

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || hasUsers}
            className="rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "Moving..." : "Move to Trash"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteOfficeModal;
