<?php

namespace App\Http\Controllers\Api;

use App\Dashboards\DashboardAssembler;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function show(Request $request, DashboardAssembler $assembler)
    {
        $validated = $request->validate([
            'period' => ['nullable', 'in:7d,30d,6m,12m'],
        ]);

        $user = $request->user();
        $user->loadMissing(['role', 'office']);

        return response()->json([
            'message' => 'Dashboard loaded successfully.',
            'data' => $assembler->assemble($user, $validated['period'] ?? '30d'),
        ]);
    }
}
