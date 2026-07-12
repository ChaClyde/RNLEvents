<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\OfficeController;

Route::controller(RoleController::class)->prefix('/roles')->group(function() {
    Route::get('/loadRoles', 'loadRoles');
    Route::post('/storeRole', 'storeRole');
});

Route::controller(OfficeController::class)->prefix('/offices')->group(function() {
    Route::get('/loadOffices', 'loadOffices');
    Route::post('/storeOffice', 'storeOffice');
});

// Route::get('/user', function (Request $request) {
//     return $request->user();
// })->middleware('auth:sanctum');
