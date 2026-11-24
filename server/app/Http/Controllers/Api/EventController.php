<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesQueriesByPermission;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Permissions\Permission;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class EventController extends Controller
{
    use ScopesQueriesByPermission;

    public function loadEvents(Request $request)
    {
        $events = $this->visibleEvents($request)
            ->with(['venue', 'office', 'letters:attachment_id,event_booking_id,original_filename,mime_type,file_size,attachment_type'])
            ->orderBy('date_start', 'desc')
            ->get();

        return response()->json([
            'events' => $events,
        ], 200);
    }

    public function getEvent(Request $request, $event_id)
    {
        $event = $this->visibleEvents($request)
            ->with(['venue', 'office', 'letters:attachment_id,event_booking_id,original_filename,mime_type,file_size,attachment_type'])
            ->whereKey($event_id)
            ->firstOrFail();

        return response()->json([
            'event' => $event,
        ], 200);
    }

    private function visibleEvents(Request $request)
    {
        return $this->constrainByPermission(
            Event::query()
                ->where('is_deleted', false)
                ->where('status', 'approved'),
            $request->user(),
            Permission::EVENTS_VIEW,
        );
    }

    private function rules(): array
    {
        return [
            'purpose' => ['required', 'string', 'max:200'],
            'venue_id' => ['required', 'exists:tbl_venues,venue_id'],
            'time_start' => ['required', 'date_format:H:i'],
            'time_end' => ['required', 'date_format:H:i', 'after:time_start'],
            'date_start' => ['required', 'date'],
            'date_end' => ['required', 'date', 'after_or_equal:date_start'],
            'chairs' => ['required', 'integer', 'min:0'],
            'lights_and_sounds' => ['boolean'],
            'piano' => ['boolean'],
            'multimedia_projector' => ['boolean'],
            'hvls_electric_fan' => ['boolean'],
            'others_specify' => ['nullable', 'string', 'max:150'],
            'others_quantity' => ['nullable', 'integer', 'min:1', 'required_with:others_specify'],
            'requested_by' => ['required', 'string', 'max:150'],
            'office_id' => ['required', 'exists:tbl_offices,office_id'],
            'email' => ['required', 'email', 'max:150'],
            'tel_number' => ['required', 'string', 'max:30'],
        ];
    }

    public function storeEvent(Request $request)
    {
        $validated = $request->validate($this->rules(), [
            'time_end.after' => 'Time end must be after time start.',
            'date_end.after_or_equal' => 'Date end must be on or after date start.',
            'venue_id.required' => 'Please select a venue.',
            'venue_id.exists' => 'Selected venue is invalid.',
            'office_id.required' => 'Please select an office.',
            'office_id.exists' => 'Selected office is invalid.',
            'others_quantity.required_with' => 'Please specify quantity for other items.',
        ]);

        unset($validated);

        throw ValidationException::withMessages([
            'status' => ['An event is added to the event list only after every approver has approved the booking.'],
        ]);
    }

    public function updateEvent(Request $request, Event $event)
    {
        $validated = $request->validate($this->rules());

        $event->update($validated);

        return response()->json([
            'message' => 'Event updated successfully.',
            'event' => $event->fresh(['venue', 'office']),
        ], 200);
    }

    public function destroyEvent(Event $event)
    {
        $event->update(['is_deleted' => true]);

        return response()->json([
            'message' => 'Event successfully deleted.',
        ], 200);
    }
}
