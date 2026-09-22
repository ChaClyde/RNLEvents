import { useState, useEffect, useCallback } from "react";
import { useModal } from "../../hooks/useModal";
import { useToast } from "../../contexts/ToastContext";
import EventService from "../../services/EventService";
import type { EventColumns } from "../../interfaces/EventColumns";
import AddEventFormModal from "./components/AddEventFormModal";
import DeleteEventFormModal from "./components/DeleteEventFormModal";
import ViewEventFormModal from "./components/ViewEventFormModal";
import EventList from "./components/EventList";
import EditEventFormModal from "./components/EditVenueFormModal";

const EventMainPage = () => {
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
  const {
    isOpen: isViewOpen,
    openModal: openViewModal,
    closeModal: closeViewModal,
  } = useModal(false);

  const [events, setEvents] = useState<EventColumns[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventColumns | null>(null);

  const { showToast } = useToast();

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await EventService.loadEvents();
      setEvents(response.data.events);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleViewEvent = (event: EventColumns) => {
    setSelectedEvent(event);
    openViewModal();
  };

  const handleEditEvent = (event: EventColumns) => {
    setSelectedEvent(event);
    openEditModal();
  };

  const handleDeleteEvent = (event: EventColumns) => {
    setSelectedEvent(event);
    openDeleteModal();
  };

  return (
    <>
      <AddEventFormModal
        isOpen={isAddOpen}
        onClose={closeAddModal}
        onEventAdded={(message) => showToast(message)}
        refreshKey={loadEvents}
      />

      <ViewEventFormModal
        event={selectedEvent}
        isOpen={isViewOpen}
        onClose={closeViewModal}
      />

      <EditEventFormModal
        event={selectedEvent}
        isOpen={isEditOpen}
        onClose={closeEditModal}
        onEventUpdated={(message) => showToast(message)}
        refreshKey={loadEvents}
      />

      <DeleteEventFormModal
        event={selectedEvent}
        isOpen={isDeleteOpen}
        onClose={closeDeleteModal}
        onDeleteEvent={(message) => showToast(message)}
        refreshKey={loadEvents}
      />

      <EventList
        events={events}
        loading={loading}
        onAddEvent={openAddModal}
        onViewEvent={handleViewEvent}
        onEditEvent={handleEditEvent}
        onDeleteEvent={handleDeleteEvent}
        onRefresh={loadEvents}
      />
    </>
  );
};

export default EventMainPage;
