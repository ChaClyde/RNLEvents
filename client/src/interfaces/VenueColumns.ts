export interface VenueColumns {
  venue_id: number;
  venue: string;
  description: string | null;
  capacity: number;
  location: string;
  venue_image: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface VenueFieldErrors {
  venue?: string[];
  description?: string[];
  capacity?: string[];
  location?: string[];
  venue_image?: string[];
}
