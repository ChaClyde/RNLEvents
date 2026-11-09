<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function loadEvents()
    {
        $events = Event::with(['venue', 'office'])
            ->where('is_deleted', false)
            ->orderBy('date_start', 'desc')
            ->get();

        return response()->json([
            'events' => $events,
        ], 200);
    }

    public function getEvent($event_id)
    {
        $event = Event::with(['venue', 'office'])
            ->where('is_deleted', false)
            ->findOrFail($event_id);

        return response()->json([
            'event' => $event,
        ], 200);
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

        $event = Event::create($validated);

        return response()->json([
            'message' => 'Event created successfully.',
            'event' => $event->load(['venue', 'office']),
        ], 201);
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
