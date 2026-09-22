import AxiosInstance from "./AxiosInstance";

const EventService = {
  loadEvents: async () => {
    try {
      const response = await AxiosInstance.get("/events/loadEvents");
      return response;
    } catch (error) {
      throw error;
    }
  },

  getEvent: async (event_id: string | number) => {
    try {
      const response = await AxiosInstance.get(`/events/getEvent/${event_id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  storeEvent: async (data: Record<string, unknown>) => {
    try {
      const response = await AxiosInstance.post("/events/storeEvent", data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateEvent: async (
    event_id: string | number,
    data: Record<string, unknown>,
  ) => {
    try {
      const response = await AxiosInstance.put(
        `/events/updateEvent/${event_id}`,
        data,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  destroyEvent: async (event_id: string | number) => {
    try {
      const response = await AxiosInstance.put(
        `/events/destroyEvent/${event_id}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default EventService;
