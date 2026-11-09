export type VenueResourceAvailability =
  | "available"
  | "consult_required"
  | "borrowed";

export type VenueResourceCondition =
  | "good"
  | "fair"
  | "damaged"
  | "not_applicable";

// ============================================================
// VENUE RESOURCE
// ============================================================

export interface VenueResource {
  resource_id: number;
  venue_id: number;

  resource_name: string;
  total_quantity: number | null;

  availability_type: VenueResourceAvailability;
  condition: VenueResourceCondition;

  coordination_office: string | null;
  notes: string | null;

  created_at?: string;
  updated_at?: string;
}

export type VenueResourceInput = Omit<
  VenueResource,
  "resource_id" | "venue_id" | "created_at" | "updated_at"
> & {
  resource_id?: number;
};

// ============================================================
// VENUE
// ============================================================

export interface VenueColumns {
  venue_id: number;

  // Basic Venue Information
  venue: string;
  description: string | null;
  capacity: number;
  location: string;

  // Person in Charge
  person_in_charge: string | null;
  pic_contact_number: string | null;
  pic_email: string | null;

  // Venue Image
  venue_image: string | null;

  // Facilities
  facilities: string[] | null;

  // Overtime Information
  overtime_rate: number | string;
  overtime_policy: string | null;

  // Venue Status
  status: "available" | "unavailable";
  is_deleted: boolean;

  // Venue Resources
  resources?: VenueResource[];

  created_at: string;
  updated_at: string;
}

// ============================================================
// FIELD ERRORS
// ============================================================

export interface VenueResourceFieldErrors {
  resource_name?: string[];
  total_quantity?: string[];
  availability_type?: string[];
  condition?: string[];
  coordination_office?: string[];
  notes?: string[];
}

export interface VenueFieldErrors {
  venue?: string[];
  description?: string[];
  capacity?: string[];
  location?: string[];

  // Person in Charge
  person_in_charge?: string[];
  pic_contact_number?: string[];
  pic_email?: string[];

  // Other Fields
  venue_image?: string[];
  facilities?: string[];
  overtime_rate?: string[];
  overtime_policy?: string[];
  status?: string[];

  // Resources
  resources?: string[];
}
