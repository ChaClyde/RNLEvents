import { useState } from "react";
import {
  FiTrash2,
  FiShield,
  FiBriefcase,
  FiUsers,
  FiMapPin,
  FiBookOpen,
  FiTruck,
  FiUser,
} from "react-icons/fi";

// Trash Sections
import RoleTrash from "./sections/RoleTrash";
import OfficeTrash from "./sections/OfficeTrash";
import UserTrash from "./sections/UserTrash";
import VenueTrash from "./sections/VenueTrash";
import EventBookingTrash from "./sections/EventBookingTrash";
import VehicleBookingTrash from "./sections/VehicleBookingTrash";

type TrashCategory =
  | "roles"
  | "offices"
  | "users"
  | "venues"
  | "event_bookings"
  | "vehicle_bookings"
  | "vehicles"
  | "drivers";

const TrashBinMainPage = () => {
  const [activeCategory, setActiveCategory] = useState<TrashCategory>("roles");

  const categories = [
    { id: "roles", label: "Roles", icon: <FiShield /> },
    { id: "offices", label: "Offices", icon: <FiBriefcase /> },
    { id: "users", label: "Users", icon: <FiUsers /> },
    { id: "venues", label: "Venues", icon: <FiMapPin /> },
    { id: "event_bookings", label: "Event Bookings", icon: <FiBookOpen /> },
    { id: "vehicle_bookings", label: "Vehicle Bookings", icon: <FiTruck /> },
    { id: "vehicles", label: "Vehicles", icon: <FiTruck /> },
    { id: "drivers", label: "Drivers", icon: <FiUser /> },
  ] as const;

  const renderActiveSection = () => {
    switch (activeCategory) {
      case "roles":
        return <RoleTrash />;

      case "offices":
        return <OfficeTrash />;

      case "users":
        return <UserTrash />;

      case "venues":
        return <VenueTrash />;

      case "event_bookings":
        return <EventBookingTrash />;

      case "vehicle_bookings":
        return <VehicleBookingTrash />;

      case "vehicles":
      case "drivers":
        return (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-10 text-center">
            <FiTrash2 className="mx-auto mb-3 text-4xl text-gray-400" />

            <h3 className="font-semibold text-gray-800 dark:text-gray-100">
              {
                categories.find((category) => category.id === activeCategory)
                  ?.label
              }{" "}
              Trash
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This section will be available once its trash functionality is
              implemented.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[#003B5C] p-3 text-white">
          <FiTrash2 size={24} />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Trash Bin
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage, restore, or permanently delete records from your system.
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => {
            const isActive = activeCategory === category.id;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`
                  flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5
                  text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? "bg-[#003B5C] text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-[#0095D9]/10 hover:text-[#00679E] dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }
                `}
              >
                <span className="text-base">{category.icon}</span>
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Trash Section */}
      <div>{renderActiveSection()}</div>
    </div>
  );
};

export default TrashBinMainPage;
