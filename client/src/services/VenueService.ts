import AxiosInstance from "./AxiosInstance";

const VenueService = {
  // Load all active venues
  loadVenues: async () => {
    return await AxiosInstance.get("/venues/loadVenues");
  },

  // Get a single venue with resources
  getVenue: async (venue_id: string | number) => {
    return await AxiosInstance.get(`/venues/getVenue/${venue_id}`);
  },

  // Create venue with resources
  storeVenue: async (data: FormData) => {
    return await AxiosInstance.post("/venues/storeVenue", data);
  },

  // Update venue with resources
  updateVenue: async (venue_id: string | number, data: FormData) => {
    data.set("_method", "PUT");

    return await AxiosInstance.post(`/venues/updateVenue/${venue_id}`, data);
  },

  // Move venue to centralized Trash Bin
  destroyVenue: async (venue_id: string | number) => {
    return await AxiosInstance.delete(`/venues/destroyVenue/${venue_id}`);
  },

  // Load venues in the Trash Bin
  loadTrashVenues: async () => {
    return await AxiosInstance.get("/venues/trash");
  },

  // Restore a venue from the Trash Bin
  restoreVenue: async (venue_id: string | number) => {
    return await AxiosInstance.put(`/venues/restoreVenue/${venue_id}`);
  },

  // Permanently delete a venue
  forceDeleteVenue: async (venue_id: string | number) => {
    return await AxiosInstance.delete(`/venues/forceDeleteVenue/${venue_id}`);
  },

  // Get venue image URL
  getVenueImage: (venue_id: string | number) => {
    return `${
      import.meta.env.VITE_BACKEND_URL ?? ""
    }/api/venues/getVenueImage/${venue_id}`;
  },

  // Remove venue image
  removeVenueImage: async (venue_id: string | number) => {
    return await AxiosInstance.delete(`/venues/removeVenueImage/${venue_id}`);
  },
};

export default VenueService;
