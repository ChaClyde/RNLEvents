import { useState, useEffect, useCallback } from "react";
import { useModal } from "../../hooks/useModal";
import EventService from "../../services/EventService";
import type { EventColumns } from "../../interfaces/EventColumns";
import ViewEventFormModal from "./components/ViewEventFormModal";
import EventList from "./components/EventList";

const EventMainPage = () => {
  const {
    isOpen: isViewOpen,
    openModal: openViewModal,
    closeModal: closeViewModal,
  } = useModal(false);

  const [events, setEvents] = useState<EventColumns[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventColumns | null>(null);

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

  return (
    <>
      <ViewEventFormModal
        event={selectedEvent}
        isOpen={isViewOpen}
        onClose={closeViewModal}
      />

      <EventList
        events={events}
        loading={loading}
        onViewEvent={handleViewEvent}
        onRefresh={loadEvents}
      />
    </>
  );
};

export default EventMainPage;
