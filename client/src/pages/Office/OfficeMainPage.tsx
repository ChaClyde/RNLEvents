import { useState } from "react";
import { Building2 } from "lucide-react";

import OfficeList from "./components/OfficeList";
import EditOfficeModal from "./components/EditOfficeModal";
import DeleteOfficeModal from "./components/DeleteOfficeModal";

import type { OfficeColumns } from "../../interfaces/OfficeColumns";
import AddOfficeModal from "./components/AddOfficeForm";

const OfficeMainPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<OfficeColumns | null>(
    null,
  );
  const [deletingOffice, setDeletingOffice] = useState<OfficeColumns | null>(
    null,
  );

  const refreshOffices = () => {
    setRefreshKey((previous) => previous + 1);
  };

  const handleOfficeAdded = () => {
    setIsAddOpen(false);
    refreshOffices();
  };

  const handleOfficeUpdated = () => {
    setEditingOffice(null);
    refreshOffices();
  };

  const handleOfficeDeleted = () => {
    setDeletingOffice(null);
    refreshOffices();
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0095D9]/10">
            <Building2 className="h-6 w-6 text-[#0095D9]" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Office Management
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage university offices, contact information, and assignments.
            </p>
          </div>
        </div>
      </div>

      {/* Office List */}
      <OfficeList
        refreshKey={refreshKey}
        onAdd={() => setIsAddOpen(true)}
        onEdit={setEditingOffice}
        onDelete={setDeletingOffice}
      />

      {/* Add Office Modal */}
      <AddOfficeModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onOfficeAdded={handleOfficeAdded}
      />

      {/* Edit Office Modal */}
      <EditOfficeModal
        office={editingOffice}
        onClose={() => setEditingOffice(null)}
        onOfficeUpdated={handleOfficeUpdated}
      />

      {/* Delete Office Modal */}
      <DeleteOfficeModal
        office={deletingOffice}
        onClose={() => setDeletingOffice(null)}
        onOfficeDeleted={handleOfficeDeleted}
      />
    </div>
  );
};

export default OfficeMainPage;
