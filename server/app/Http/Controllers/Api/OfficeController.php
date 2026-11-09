<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Office;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OfficeController extends Controller
{
    private const NAME_REGEX = '/^[\p{L}0-9\s\/&().\'-]+$/u';

    /*
    |--------------------------------------------------------------------------
    | 1. LOAD OFFICES
    |--------------------------------------------------------------------------
    */

    public function loadOffices()
    {
        $offices = Office::active()
            ->withCount('users')
            ->orderBy('office_name')
            ->get();

        return response()->json([
            'offices' => $offices,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | 2. LOAD TRASHED OFFICES
    |--------------------------------------------------------------------------
    */

    public function loadTrashOffices()
    {
        $offices = Office::onlyDeleted()
            ->withCount('users')
            ->orderBy('office_name')
            ->get();
    
        return response()->json([
            'offices' => $offices,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | 3. GET A SINGLE OFFICE
    |--------------------------------------------------------------------------
    */

    public function getOffice(Office $office)
    {
        if ($office->is_deleted) {
            return response()->json([
                'message' => 'Office not found.',
            ], 404);
        }

        $office->loadCount('users');

        return response()->json([
            'office' => $office,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | 4. CREATE OFFICE
    |--------------------------------------------------------------------------
    */

    public function storeOffice(Request $request)
    {
        $validated = $request->validate([
            'office_code' => [
                'required',
                'string',
                'min:2',
                'max:50',
                'alpha_dash',
                Rule::unique('tbl_offices', 'office_code'),
            ],

            'office_name' => [
                'required',
                'string',
                'min:3',
                'max:150',
                'regex:' . self::NAME_REGEX,
                Rule::unique('tbl_offices', 'office_name'),
            ],

            'office_type' => [
                'nullable',
                'string',
                'max:100',
            ],

            'description' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'contact_email' => [
                'nullable',
                'email',
                'max:150',
            ],

            'contact_number' => [
                'nullable',
                'string',
                'max:30',
            ],

            'location' => [
                'nullable',
                'string',
                'max:255',
            ],

            'status' => [
                'sometimes',
                'required',
                Rule::in(['active', 'inactive']),
            ],
        ], [
            'office_code.unique' => 'Office code already exists.',
            'office_name.regex' => 'Office name contains invalid characters.',
            'office_name.unique' => 'Office name already exists.',
        ]);

        $office = Office::create([
            'office_code' => strtoupper($validated['office_code']),
            'office_name' => $validated['office_name'],
            'office_type' => $validated['office_type'] ?? null,
            'description' => $validated['description'] ?? null,
            'contact_email' => $validated['contact_email'] ?? null,
            'contact_number' => $validated['contact_number'] ?? null,
            'location' => $validated['location'] ?? null,
            'status' => $validated['status'] ?? 'active',
        ]);

        return response()->json([
            'message' => 'Office created successfully.',
            'data' => $office,
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | 5. UPDATE OFFICE
    |--------------------------------------------------------------------------
    */

    public function updateOffice(Request $request, Office $office)
    {
        if ($office->is_deleted) {
            return response()->json([
                'message' => 'Office not found.',
            ], 404);
        }

        $validated = $request->validate([
            'office_code' => [
                'sometimes',
                'required',
                'string',
                'min:2',
                'max:50',
                'alpha_dash',
                Rule::unique('tbl_offices', 'office_code')
                    ->ignore($office->office_id, 'office_id'),
            ],

            'office_name' => [
                'sometimes',
                'required',
                'string',
                'min:3',
                'max:150',
                'regex:' . self::NAME_REGEX,
                Rule::unique('tbl_offices', 'office_name')
                    ->ignore($office->office_id, 'office_id'),
            ],

            'office_type' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
            ],

            'description' => [
                'sometimes',
                'nullable',
                'string',
                'max:5000',
            ],

            'contact_email' => [
                'sometimes',
                'nullable',
                'email',
                'max:150',
            ],

            'contact_number' => [
                'sometimes',
                'nullable',
                'string',
                'max:30',
            ],

            'location' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'status' => [
                'sometimes',
                'required',
                Rule::in(['active', 'inactive']),
            ],
        ], [
            'office_code.unique' => 'Office code already exists.',
            'office_name.regex' => 'Office name contains invalid characters.',
            'office_name.unique' => 'Office name already exists.',
        ]);

        if (isset($validated['office_code'])) {
            $validated['office_code'] = strtoupper(
                $validated['office_code']
            );
        }

        $office->update($validated);

        return response()->json([
            'message' => 'Office updated successfully.',
            'office' => $office->fresh(),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | 6. ACTIVATE OFFICE
    |--------------------------------------------------------------------------
    */

    public function activateOffice(Office $office)
    {
        if ($office->is_deleted) {
            return response()->json([
                'message' => 'Office not found.',
            ], 404);
        }

        $office->update([
            'status' => 'active',
        ]);

        return response()->json([
            'message' => 'Office activated successfully.',
            'office' => $office->fresh(),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | 7. DEACTIVATE OFFICE
    |--------------------------------------------------------------------------
    */

    public function deactivateOffice(Office $office)
    {
        if ($office->is_deleted) {
            return response()->json([
                'message' => 'Office not found.',
            ], 404);
        }

        $office->update([
            'status' => 'inactive',
        ]);

        return response()->json([
            'message' => 'Office deactivated successfully.',
            'office' => $office->fresh(),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | 8. MOVE OFFICE TO TRASH
    |--------------------------------------------------------------------------
    */

    public function destroyOffice(Office $office)
    {
        if ($office->is_deleted) {
            return response()->json([
                'message' => 'Office is already deleted.',
            ], 422);
        }

        // Prevent deletion while non-deleted users are assigned.
        if ($office->users()->exists()) {
            return response()->json([
                'message' => 'Reassign the users in this office before deleting it.',
            ], 422);
        }

        $office->update([
            'is_deleted' => true,
        ]);

        return response()->json([
            'message' => 'Office successfully deleted.',
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | 9. RESTORE OFFICE
    |--------------------------------------------------------------------------
    */

    public function restoreOffice(Office $office)
    {
        if (!$office->is_deleted) {
            return response()->json([
                'message' => 'This office is already active.',
            ], 422);
        }

        $office->update([
            'is_deleted' => false,
        ]);

        return response()->json([
            'message' => 'Office restored successfully.',
            'office' => $office->fresh(),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | 10. PERMANENTLY DELETE OFFICE
    |--------------------------------------------------------------------------
    */

    public function forceDeleteOffice(Office $office)
    {
        if (!$office->is_deleted) {
            return response()->json([
                'message' => 'Only deleted offices can be permanently removed.',
            ], 422);
        }

        // Check all user records, including users in the trash.
        if (User::where('office_id', $office->office_id)->exists()) {
            return response()->json([
                'message' => 'This office is still assigned to existing user records. Reassign or permanently remove those user records first.',
            ], 422);
        }

        $office->delete();

        return response()->json([
            'message' => 'Office permanently deleted.',
        ], 200);
    }
}
