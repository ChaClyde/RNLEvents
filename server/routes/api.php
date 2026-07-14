<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\OfficeController;

Route::controller(RoleController::class)->prefix('/roles')->group(function() {
    Route::get('/loadRoles', 'loadRoles');
    Route::get('/getRole/{role_id}', 'getRole');
    Route::post('/storeRole', 'storeRole');
    Route::put('/updateRole/{role}', 'updateRole');
    Route::put('/destroyRole/{role}', 'destroyRole');
});

Route::controller(OfficeController::class)->prefix('/offices')->group(function() {
    Route::get('/loadOffices', 'loadOffices');
    Route::get('/getOffice/{office_id}', 'getOffice');
    Route::post('/storeOffice', 'storeOffice');
    Route::put('/updateOffice/{office}', 'updateOffice');
    Route::put('/destroyOffice/{office}', 'destroyOffice');
});

// Route::get('/user', function (Request $request) {
//     return $request->user();
// })->middleware('auth:sanctum');
