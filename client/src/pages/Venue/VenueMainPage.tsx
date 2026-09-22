import { useState, useEffect, useCallback } from "react";
import { useModal } from "../../hooks/useModal";
import { useToast } from "../../contexts/ToastContext";
import VenueService from "../../services/VenueService";
import type { VenueColumns } from "../../interfaces/VenueColumns";
import AddVenueFormModal from "./components/AddVenueFormModal";
import VenueList from "./components/VenueList";
import EditVenueFormModal from "./components/EditFormModal";
import DeleteVenueFormModal from "./components/DeleteFormModal";

const VenueMainPage = () => {
  const {
    isOpen: isAddOpen,
    openModal: openAddModal,
    closeModal: closeAddModal,
  } = useModal(false);
  const {
    isOpen: isEditOpen,
    openModal: openEditModal,
    closeModal: closeEditModal,
  } = useModal(false);
  const {
    isOpen: isDeleteOpen,
    openModal: openDeleteModal,
    closeModal: closeDeleteModal,
  } = useModal(false);

  const [venues, setVenues] = useState<VenueColumns[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<VenueColumns | null>(null);

  const { showToast } = useToast();

  const loadVenues = useCallback(async () => {
    setLoading(true);
    try {
      const response = await VenueService.loadVenues();
      setVenues(response.data.venues);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  const handleEditVenue = (venue: VenueColumns) => {
    setSelectedVenue(venue);
    openEditModal();
  };

  const handleDeleteVenue = (venue: VenueColumns) => {
    setSelectedVenue(venue);
    openDeleteModal();
  };

  return (
    <>
      <AddVenueFormModal
        isOpen={isAddOpen}
        onClose={closeAddModal}
        onVenueAdded={(message) => showToast(message)}
        refreshKey={loadVenues}
      />

      <EditVenueFormModal
        venue={selectedVenue}
        isOpen={isEditOpen}
        onClose={closeEditModal}
        onVenueUpdated={(message) => showToast(message)}
        refreshKey={loadVenues}
      />

      <DeleteVenueFormModal
        venue={selectedVenue}
        isOpen={isDeleteOpen}
        onClose={closeDeleteModal}
        onDeleteVenue={(message) => showToast(message)}
        refreshKey={loadVenues}
      />

      <VenueList
        venues={venues}
        loading={loading}
        onAddVenue={openAddModal}
        onEditVenue={handleEditVenue}
        onDeleteVenue={handleDeleteVenue}
        onRefresh={loadVenues}
      />
    </>
  );
};

export default VenueMainPage;
