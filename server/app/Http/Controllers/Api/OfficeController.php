<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Office;

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
}
