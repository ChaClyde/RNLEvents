import { useCallback, useEffect, useState } from "react";
import { RefreshCw, RotateCcw, Trash2, AlertCircle, Users } from "lucide-react";

import UserService from "../../../services/UserService";
import type { UserColumns } from "../../../interfaces/UserColumns";

const UserTrash = () => {
  const [users, setUsers] = useState<UserColumns[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadTrashUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await UserService.loadTrashUsers();

      const userData = response.data?.users ?? response.data?.data ?? [];

      if (!Array.isArray(userData)) {
        throw new Error("Invalid trash data received from the server.");
      }

      setUsers(userData);
    } catch (err: any) {
      console.error("Failed to load deleted users:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load deleted users.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrashUsers();
  }, [loadTrashUsers]);

  const handleRestore = async (user: UserColumns) => {
    const confirmed = window.confirm(
      `Restore ${user.full_name || user.username}?`,
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await UserService.restoreUser(user.user_id);

      setMessage(response.data?.message || "User restored successfully.");

      await loadTrashUsers();
    } catch (err: any) {
      console.error("Failed to restore user:", err);

      setError(err.response?.data?.message || "Unable to restore this user.");
    }
  };

  const handleForceDelete = async (user: UserColumns) => {
    const confirmed = window.confirm(
      `Permanently delete ${user.full_name || user.username}?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await UserService.forceDeleteUser(user.user_id);

      setMessage(response.data?.message || "User permanently deleted.");

      await loadTrashUsers();
    } catch (err: any) {
      console.error("Failed to permanently delete user:", err);

      setError(
        err.response?.data?.message ||
          "Unable to permanently delete this user.",
      );
    }
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "—";

    return parsedDate.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-[#0095D9]" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Deleted Users
            </h2>
          </div>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Restore deleted user accounts or permanently remove them.
          </p>
        </div>

        <button
          type="button"
          onClick={loadTrashUsers}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00679E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#003B5C] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400">
          {message}
        </div>
      )}

      {/* Count */}
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/40">
          <Users className="h-6 w-6 text-[#0095D9]" />
        </div>

        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Deleted user accounts
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {users.length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {loading ? (
          <div className="flex items-center justify-center gap-3 p-10 text-gray-500 dark:text-gray-400">
            <RefreshCw size={20} className="animate-spin" />
            Loading deleted users...
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Trash2 className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />

            <h3 className="font-semibold text-gray-800 dark:text-white">
              No deleted users
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Deleted user accounts will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-212.5 text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900/50 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Username</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Office</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Account Status</th>
                  <th className="px-5 py-4">Deleted</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.map((user) => (
                  <tr
                    key={user.user_id}
                    className="transition hover:bg-gray-50 dark:hover:bg-gray-700/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {user.profile_photo_url ? (
                          <img
                            src={user.profile_photo_url}
                            alt={user.full_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00679E]/10 font-semibold text-[#00679E] dark:bg-[#0095D9]/20 dark:text-[#0095D9]">
                            {user.first_name?.charAt(0)}
                            {user.last_name?.charAt(0)}
                          </div>
                        )}

                        <span className="font-medium text-gray-900 dark:text-white">
                          {user.full_name}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                      {user.username}
                    </td>

                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                      {user.email}
                    </td>

                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                      {user.office?.office_name ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                      {user.role?.name ?? "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        {user.account_status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                      {formatDate(user.updated_at)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleRestore(user)}
                          title="Restore user"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700 transition hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400 dark:hover:bg-green-950/60"
                        >
                          <RotateCcw size={15} />
                          Restore
                        </button>

                        <button
                          type="button"
                          onClick={() => handleForceDelete(user)}
                          title="Permanently delete user"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/60"
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserTrash;
