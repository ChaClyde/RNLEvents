<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Office;
use Illuminate\Validation\Rule;

class OfficeController extends Controller
{
    public function loadOffices()
    {
        $offices = Office::where('tbl_offices.is_deleted', false)
            ->get();

        return response()->json([
            'offices' => $offices,
        ], 200);
    }

    public function storeOffice(Request $request)
    {
        $validated = $request->validate([
            'office' => ['required', 'string', 'min:3', 'max:30', 'regex:/^[A-Za-z\s]+$/', 'unique:tbl_offices,office'],
            'description' => ['nullable', 'string', 'min:3', 'max:255', 'regex:/^[A-Za-z\s]+$/'],
        ]);

        $office = Office::create([
            'office' => $validated['office'],
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json([
            'message' => 'Office created successfully.',
            'data' => $office,
        ], 201);
    }

    public function getOffice($office_id)
    {
        $office = Office::find($office_id);

        return response()->json([
            'office' => $office,
        ], 200);

    }

    public function updateOffice(Request $request, Office $office)
    {
        $validated = $request->validate([
            'office' => ['required', 'string', 'min:3', 'max:30', 'regex:/^[A-Za-z\s]+$/', Rule::unique('tbl_offices', 'office')->ignore($office->office_id, 'office_id'),],
            'description' => ['nullable', 'string', 'min:3', 'max:255', 'regex:/^[A-Za-z\s]+$/',],
        ]);

        $office->update([
            'office' => $validated['office'],
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json([
            'office' => $office,
            'message' => 'Office updated successfully.',
        ], 200);
    }

    public function destroyOffice(Office $office)
    {
        $office->update([
            'is_deleted' => true,
        ]);

        return response()->json([
            'message' => 'Office successfully deleted.',
        ], 200);
    }
}
