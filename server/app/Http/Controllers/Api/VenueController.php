<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Throwable;

class VenueController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Venue Relationships
    |--------------------------------------------------------------------------
    */

    private function venueRelations(): array
    {
        return [
            'resources',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Load All Active Venues
    |--------------------------------------------------------------------------
    */

    public function loadVenues()
    {
        $venues = Venue::with($this->venueRelations())
            ->where('is_deleted', false)
            ->orderBy('venue', 'asc')
            ->get();

        return response()->json([
            'message' => 'Venues retrieved successfully.',
            'data' => $venues,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Get Single Venue
    |--------------------------------------------------------------------------
    */

    public function getVenue($venue_id)
    {
        $venue = Venue::with($this->venueRelations())
            ->where('is_deleted', false)
            ->findOrFail($venue_id);

        return response()->json([
            'message' => 'Venue retrieved successfully.',
            'data' => $venue,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Store Venue
    |--------------------------------------------------------------------------
    */

    public function storeVenue(Request $request)
    {
        $validated = $request->validate([

            // Basic Information
            'venue' => [
                'required',
                'string',
                'max:100',
                'unique:tbl_venues,venue',
            ],

            'description' => [
                'nullable',
                'string',
            ],

            'capacity' => [
                'required',
                'integer',
                'min:1',
            ],

            'location' => [
                'required',
                'string',
                'max:150',
            ],

            // Person in Charge
            'person_in_charge' => [
                'nullable',
                'string',
                'max:150',
            ],

            'pic_contact_number' => [
                'nullable',
                'string',
                'max:30',
            ],

            'pic_email' => [
                'nullable',
                'email:rfc',
                'max:255',
            ],

            // Venue Image
            'venue_image' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],

            // Facilities
            'facilities' => [
                'nullable',
                'array',
            ],

            'facilities.*' => [
                'string',
                'max:100',
            ],

            // Overtime Information
            'overtime_rate' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'overtime_policy' => [
                'nullable',
                'string',
            ],

            // Venue Status
            'status' => [
                'nullable',
                Rule::in([
                    'available',
                    'unavailable',
                ]),
            ],

            // Venue Resources
            'resources' => [
                'nullable',
                'array',
            ],

            'resources.*.resource_name' => [
                'required',
                'string',
                'max:100',
                'distinct',
            ],

            'resources.*.total_quantity' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'resources.*.availability_type' => [
                'required',
                Rule::in([
                    'available',
                    'consult_required',
                    'borrowed',
                ]),
            ],

            'resources.*.condition' => [
                'required',
                Rule::in([
                    'good',
                    'fair',
                    'damaged',
                    'not_applicable',
                ]),
            ],

            'resources.*.coordination_office' => [
                'nullable',
                'string',
                'max:100',
            ],

            'resources.*.notes' => [
                'nullable',
                'string',
            ],
        ]);

        $imagePath = null;

        DB::beginTransaction();

        try {

            // Upload Venue Image
            if ($request->hasFile('venue_image')) {
                $imagePath = $request->file('venue_image')
                    ->store('venues', 'public');
            }

            // Prepare Venue Data
            $venueData = [
                'venue' => $validated['venue'],
                'description' => $validated['description'] ?? null,
                'capacity' => $validated['capacity'],
                'location' => $validated['location'],

                // Person in Charge
                'person_in_charge' => $validated['person_in_charge'] ?? null,
                'pic_contact_number' => $validated['pic_contact_number'] ?? null,
                'pic_email' => $validated['pic_email'] ?? null,

                // Image
                'venue_image' => $imagePath,

                // Facilities
                'facilities' => $validated['facilities'] ?? [],

                // Overtime
                'overtime_rate' => $validated['overtime_rate'] ?? 0,
                'overtime_policy' => $validated['overtime_policy'] ?? null,

                // Status
                'status' => $validated['status'] ?? 'available',
                'is_deleted' => false,
            ];

            // Create Venue
            $venue = Venue::create($venueData);

            // Create Venue Resources
            foreach ($validated['resources'] ?? [] as $resource) {
                $venue->resources()->create([
                    'resource_name' => $resource['resource_name'],
                    'total_quantity' => $resource['total_quantity'] ?? null,
                    'availability_type' => $resource['availability_type'],
                    'condition' => $resource['condition'],
                    'coordination_office' => $resource['coordination_office'] ?? null,
                    'notes' => $resource['notes'] ?? null,
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Venue created successfully.',
                'data' => $venue->load($this->venueRelations()),
            ], 201);

        } catch (Throwable $e) {

            DB::rollBack();

            // Remove Uploaded Image if Database Operation Fails
            if ($imagePath) {
                Storage::disk('public')->delete($imagePath);
            }

            report($e);

            return response()->json([
                'message' => 'Failed to create venue.',
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Update Venue
    |--------------------------------------------------------------------------
    */

    public function updateVenue(Request $request, $venue_id)
    {
        $venue = Venue::where('is_deleted', false)
            ->findOrFail($venue_id);

        $validated = $request->validate([

            // Basic Information
            'venue' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('tbl_venues', 'venue')
                    ->ignore($venue->venue_id, 'venue_id'),
            ],

            'description' => [
                'sometimes',
                'nullable',
                'string',
            ],

            'capacity' => [
                'sometimes',
                'required',
                'integer',
                'min:1',
            ],

            'location' => [
                'sometimes',
                'required',
                'string',
                'max:150',
            ],

            // Person in Charge
            'person_in_charge' => [
                'sometimes',
                'nullable',
                'string',
                'max:150',
            ],

            'pic_contact_number' => [
                'sometimes',
                'nullable',
                'string',
                'max:30',
            ],

            'pic_email' => [
                'sometimes',
                'nullable',
                'email:rfc',
                'max:255',
            ],

            // Venue Image
            'venue_image' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],

            'remove_image' => [
                'sometimes',
                'boolean',
            ],

            // Facilities
            'facilities' => [
                'sometimes',
                'nullable',
                'array',
            ],

            'facilities.*' => [
                'string',
                'max:100',
            ],

            // Overtime Information
            'overtime_rate' => [
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],

            'overtime_policy' => [
                'sometimes',
                'nullable',
                'string',
            ],

            // Venue Status
            'status' => [
                'sometimes',
                Rule::in([
                    'available',
                    'unavailable',
                ]),
            ],

            // Venue Resources
            'resources' => [
                'sometimes',
                'nullable',
                'array',
            ],

            'resources.*.resource_id' => [
                'nullable',
                'integer',
                Rule::exists('tbl_venue_resources', 'resource_id')
                    ->where('venue_id', $venue->venue_id),
            ],

            'resources.*.resource_name' => [
                'required',
                'string',
                'max:100',
                'distinct',
            ],

            'resources.*.total_quantity' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'resources.*.availability_type' => [
                'required',
                Rule::in([
                    'available',
                    'consult_required',
                    'borrowed',
                ]),
            ],

            'resources.*.condition' => [
                'required',
                Rule::in([
                    'good',
                    'fair',
                    'damaged',
                    'not_applicable',
                ]),
            ],

            'resources.*.coordination_office' => [
                'nullable',
                'string',
                'max:100',
            ],

            'resources.*.notes' => [
                'nullable',
                'string',
            ],
        ]);

        $oldImagePath = $venue->venue_image;
        $newImagePath = null;
        $shouldDeleteOldImage = false;

        DB::beginTransaction();

        try {

            // Update Basic Venue Information
            $venueFields = [
                'venue',
                'description',
                'capacity',
                'location',

                // Person in Charge
                'person_in_charge',
                'pic_contact_number',
                'pic_email',

                // Other Information
                'facilities',
                'overtime_rate',
                'overtime_policy',
                'status',
            ];

            foreach ($venueFields as $field) {
                if (array_key_exists($field, $validated)) {
                    $venue->{$field} = $validated[$field];
                }
            }

            // Upload Replacement Image
            if ($request->hasFile('venue_image')) {

                $newImagePath = $request->file('venue_image')
                    ->store('venues', 'public');

                $venue->venue_image = $newImagePath;

                $shouldDeleteOldImage = !empty($oldImagePath);
            }

            // Remove Existing Image
            elseif (!empty($validated['remove_image'])) {

                $venue->venue_image = null;

                $shouldDeleteOldImage = !empty($oldImagePath);
            }

            $venue->save();

            /*
            |--------------------------------------------------------------------------
            | Synchronize Venue Resources
            |--------------------------------------------------------------------------
            |
            | If resources is omitted:
            | Existing resources remain untouched.
            |
            | If resources is supplied:
            | It becomes the new resource list.
            |
            */

            if (
                array_key_exists('resources', $validated) &&
                is_array($validated['resources'])
            ) {
                $resources = $validated['resources'];

                $submittedIds = collect($resources)
                    ->pluck('resource_id')
                    ->filter()
                    ->map(fn ($id) => (int) $id)
                    ->values()
                    ->all();

                // Temporarily Rename Existing Resources
                // to Avoid Unique Constraint Conflicts
                $existingResources = $venue->resources()->get();

                foreach ($existingResources as $existingResource) {
                    $existingResource->update([
                        'resource_name' => '__sync_' .
                            $existingResource->resource_id . '_' .
                            uniqid(),
                    ]);
                }

                // Remove Resources Omitted from Submission
                if (empty($submittedIds)) {

                    $venue->resources()->delete();

                } else {

                    $venue->resources()
                        ->whereNotIn('resource_id', $submittedIds)
                        ->delete();
                }

                // Update Existing Resources or Create New Ones
                foreach ($resources as $resource) {

                    $resourceData = [
                        'resource_name' => $resource['resource_name'],
                        'total_quantity' => $resource['total_quantity'] ?? null,
                        'availability_type' => $resource['availability_type'],
                        'condition' => $resource['condition'],
                        'coordination_office' => $resource['coordination_office'] ?? null,
                        'notes' => $resource['notes'] ?? null,
                    ];

                    if (!empty($resource['resource_id'])) {

                        $venue->resources()
                            ->where('resource_id', $resource['resource_id'])
                            ->update($resourceData);

                    } else {

                        $venue->resources()->create($resourceData);
                    }
                }
            }

            DB::commit();

            // Delete Old Image Only After Successful Update
            if ($shouldDeleteOldImage && $oldImagePath) {
                Storage::disk('public')->delete($oldImagePath);
            }

            return response()->json([
                'message' => 'Venue updated successfully.',
                'data' => $venue->fresh()->load($this->venueRelations()),
            ], 200);

        } catch (Throwable $e) {

            DB::rollBack();

            // Delete Newly Uploaded Image if Update Fails
            if ($newImagePath) {
                Storage::disk('public')->delete($newImagePath);
            }

            report($e);

            return response()->json([
                'message' => 'Failed to update venue.',
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Soft Delete Venue
    |--------------------------------------------------------------------------
    */

    public function destroyVenue($venue_id)
    {
        $venue = Venue::where('is_deleted', false)
            ->findOrFail($venue_id);

        $venue->update([
            'is_deleted' => true,
        ]);

        return response()->json([
            'message' => 'Venue moved to trash successfully.',
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Get Venue Image
    |--------------------------------------------------------------------------
    */

    public function showVenueImage($venue_id)
    {
        $venue = Venue::where('is_deleted', false)
            ->findOrFail($venue_id);

        if (
            !$venue->venue_image ||
            !Storage::disk('public')->exists($venue->venue_image)
        ) {
            return response()->json([
                'message' => 'Venue image not found.',
            ], 404);
        }

        return Storage::disk('public')->response(
            $venue->venue_image
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Remove Venue Image
    |--------------------------------------------------------------------------
    */

    public function removeVenueImage($venue_id)
    {
        $venue = Venue::where('is_deleted', false)
            ->findOrFail($venue_id);

        if ($venue->venue_image) {

            Storage::disk('public')->delete($venue->venue_image);

            $venue->update([
                'venue_image' => null,
            ]);
        }

        return response()->json([
            'message' => 'Venue image removed successfully.',
        ], 200);
    }

    /*
|--------------------------------------------------------------------------
| Load Trashed Venues
|--------------------------------------------------------------------------
*/

public function loadTrashVenues()
{
    $venues = Venue::with($this->venueRelations())
        ->where('is_deleted', true)
        ->orderByDesc('updated_at')
        ->get();

    return response()->json([
        'message' => 'Trashed venues retrieved successfully.',
        'data' => $venues,
    ], 200);
}

/*
|--------------------------------------------------------------------------
| Restore Venue
|--------------------------------------------------------------------------
*/

public function restoreVenue($venue_id)
{
    $venue = Venue::where('is_deleted', true)
        ->findOrFail($venue_id);

    $venue->update([
        'is_deleted' => false,
    ]);

    return response()->json([
        'message' => 'Venue restored successfully.',
        'data' => $venue->load($this->venueRelations()),
    ], 200);
}

    /*
    |--------------------------------------------------------------------------
    | Permanently Delete Venue
    |--------------------------------------------------------------------------
    */

    public function forceDeleteVenue($venue_id)
    {
        $venue = Venue::where('is_deleted', true)
            ->findOrFail($venue_id);

        $imagePath = $venue->venue_image;

        try {
            // Resources are removed automatically (cascadeOnDelete)
            $venue->delete();
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Failed to permanently delete venue.',
            ], 500);
        }

        if ($imagePath) {
            Storage::disk('public')->delete($imagePath);
        }

        return response()->json([
            'message' => 'Venue permanently deleted.',
        ], 200);
    }
}
