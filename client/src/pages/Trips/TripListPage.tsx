import { useCallback, useEffect, useState } from "react";
import { FiTruck } from "react-icons/fi";
import VehicleBookingService from "../../services/VehicleBookingService";
import type { VehicleBooking } from "../../interfaces/VehicleBookingColumns";
import { getVehicleBookingErrorMessage } from "../../interfaces/VehicleBookingHelpers";
import VehicleBookingView from "../VehicleBooking/components/VehicleBookingView";

export default function TripListPage() {
  const [trips, setTrips] = useState<VehicleBooking[]>([]);
  const [selected, setSelected] = useState<VehicleBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await VehicleBookingService.getAll({ status: "approved" });
      setTrips(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(getVehicleBookingErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-[#101820] sm:p-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#003B5C] text-white">
            <FiTruck size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#003B5C] dark:text-white">Trip List</h1>
            <p className="text-sm text-gray-500">
              Approved vehicle bookings are listed here as trips.
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-[#17232E]">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Travel</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Loading trips...
                  </td>
                </tr>
              )}
              {!loading && trips.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No approved trip yet.
                  </td>
                </tr>
              )}
              {trips.map((trip) => (
                <tr key={trip.vehicle_booking_id} className="border-t">
                  <td className="px-4 py-3 font-medium">{trip.purpose}</td>
                  <td className="px-4 py-3">{trip.destination}</td>
                  <td className="px-4 py-3">{trip.travel_date}</td>
                  <td className="px-4 py-3">{trip.vehicle?.vehicle_name ?? "Not assigned"}</td>
                  <td className="px-4 py-3">{trip.driver?.driver_name ?? "Not assigned"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(trip)}
                      className="rounded-lg bg-[#00679E] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <VehicleBookingView
          isOpen
          booking={selected}
          canApprove={false}
          canCancel={false}
          canAssign={false}
          isActing={false}
          onClose={() => setSelected(null)}
          onApprove={() => undefined}
          onReject={() => undefined}
          onCancelBooking={() => undefined}
          onAssign={() => undefined}
        />
      )}
    </div>
  );
}
