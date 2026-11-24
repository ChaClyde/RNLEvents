<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Venues\FacilityRateSchedule;

class FacilityRateController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => FacilityRateSchedule::document(),
        ]);
    }
}
