<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VenueController extends Controller
{
    public function loadVenues()
    {
        $venues = Venue::where('is_deleted', false)->get();

        return response()->json([
            'venues' => $venues,
        ], 200);
    }

    public function getVenue($venue_id)
    {
        $venue = Venue::findOrFail($venue_id);

        return response()->json([
            'venue' => $venue,
        ], 200);
    }

    public function storeVenue(Request $request)
    {
        $validated = $request->validate([
            'venue_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'venue' => ['required', 'string', 'min:3', 'max:100', 'unique:tbl_venues,venue'],
            'description' => ['nullable', 'string', 'max:1000'],
            'capacity' => ['required', 'integer', 'min:1'],
            'location' => ['required', 'string', 'max:150'],
        ], [
            'venue_image.image' => 'Venue image must be an image.',
            'venue_image.mimes' => 'Venue image must be JPG, JPEG, PNG or WEBP.',
            'venue_image.max' => 'Venue image must not exceed 2MB.',
            'venue.required' => 'Venue name is required.',
            'venue.unique' => 'A venue with this name already exists.',
            'capacity.required' => 'Capacity is required.',
            'capacity.integer' => 'Capacity must be a whole number.',
            'capacity.min' => 'Capacity must be at least 1.',
            'location.required' => 'Location is required.',
        ]);

        $imagePath = null;

        if ($request->hasFile('venue_image')) {
            $imagePath = $request->file('venue_image')->store('', 'venues');
        }

        $venue = Venue::create([
            'venue' => $validated['venue'],
            'description' => $validated['description'] ?? null,
            'capacity' => $validated['capacity'],
            'location' => $validated['location'],
            'venue_image' => $imagePath,
        ]);

        return response()->json([
            'message' => 'Venue created successfully.',
            'venue' => $venue,
        ], 201);
    }

    public function updateVenue(Request $request, Venue $venue)
    {
        $validated = $request->validate([
            'venue_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'venue' => [
                'required', 'string', 'min:3', 'max:100',
                'unique:tbl_venues,venue,' . $venue->venue_id . ',venue_id',
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'capacity' => ['required', 'integer', 'min:1'],
            'location' => ['required', 'string', 'max:150'],
        ]);

        $imagePath = $venue->venue_image;

        if ($request->hasFile('venue_image')) {

            if ($venue->venue_image && Storage::disk('venues')->exists($venue->venue_image)) {
                Storage::disk('venues')->delete($venue->venue_image);
            }
            $imagePath = $request->file('venue_image')->store('', 'venues');
        } elseif ($request->boolean('remove_image')) {

            if ($venue->venue_image && Storage::disk('venues')->exists($venue->venue_image)) {
                Storage::disk('venues')->delete($venue->venue_image);
            }
            $imagePath = null;
        }

        $venue->update([
            'venue' => $validated['venue'],
            'description' => $validated['description'] ?? null,
            'capacity' => $validated['capacity'],
            'location' => $validated['location'],
            'venue_image' => $imagePath,
        ]);

        return response()->json([
            'message' => 'Venue updated successfully.',
            'venue' => $venue->fresh(),
        ], 200);
    }

    public function destroyVenue(Venue $venue)
    {
        $venue->update(['is_deleted' => true]);

        return response()->json([
            'message' => 'Venue successfully deleted.',
        ], 200);
    }

    /**
     * Stream a venue's image (private disk)
     */
    public function showVenueImage(Venue $venue)
    {
        if (!$venue->venue_image || !Storage::disk('venues')->exists($venue->venue_image)) {
            abort(404);
        }

        return Storage::disk('venues')->response($venue->venue_image);
    }

    /**
     * Remove a venue's image without deleting the venue record
     */
    public function removeVenueImage(Venue $venue)
    {
        if ($venue->venue_image && Storage::disk('venues')->exists($venue->venue_image)) {
            Storage::disk('venues')->delete($venue->venue_image);
        }

        $venue->update(['venue_image' => null]);

        return response()->json([
            'message' => 'Venue image removed successfully.',
        ], 200);
    }
}
