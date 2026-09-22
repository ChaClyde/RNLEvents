import AxiosInstance from "./AxiosInstance";

const VenueService = {
  loadVenues: async () => {
    try {
      const response = await AxiosInstance.get("/venues/loadVenues");
      return response;
    } catch (error) {
      throw error;
    }
  },

  getVenue: async (venue_id: string | number) => {
    try {
      const response = await AxiosInstance.get(`/venues/getVenue/${venue_id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  storeVenue: async (data: FormData) => {
    try {
      const response = await AxiosInstance.post("/venues/storeVenue", data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateVenue: async (venue_id: string | number, data: FormData) => {
    try {
      data.append("_method", "PUT");
      const response = await AxiosInstance.post(
        `/venues/updateVenue/${venue_id}`,
        data,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  destroyVenue: async (venue_id: string | number) => {
    try {
      const response = await AxiosInstance.put(
        `/venues/destroyVenue/${venue_id}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default VenueService;
