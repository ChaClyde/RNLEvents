<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\OfficeController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VenueController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\DriverController;

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

Route::controller(UserController::class)->prefix('/users')->group(function() {
    Route::get('/loadUsers', 'loadUsers');
    Route::post('/storeUser', 'storeUser');
    Route::get('/getUser/{user_id}', 'getUser');
    Route::put('/updateUser/{user}', 'updateUser');
    Route::delete('/destroyUser/{user}', 'destroyUser');
    Route::get('/loadTrashUsers', 'loadTrashUsers');
    Route::put('/restoreUser/{user}', 'restoreUser');
    Route::delete('/forceDeleteUser/{user}', 'forceDeleteUser');
    Route::post('/uploadProfilePhoto/{user}', 'uploadProfilePhoto');
    Route::get('/getProfilePhoto/{user}', 'showProfilePhoto');
    Route::delete('/removeProfilePhoto/{user}', 'removeProfilePhoto');
    Route::put('/updateProfile', 'updateProfile');
});

Route::controller(VenueController::class)->prefix('/venues')->group(function() {
    Route::get('/loadVenues', 'loadVenues');
    Route::get('/getVenue/{venue_id}', 'getVenue');
    Route::post('/storeVenue', 'storeVenue');
    Route::put('/updateVenue/{venue}', 'updateVenue');
    Route::put('/destroyVenue/{venue}', 'destroyVenue');
    Route::get('/trash', 'loadTrashVenues');
    Route::put('/restoreVenue/{venue}', 'restoreVenue');
    Route::delete('/forceDeleteVenue/{venue}', 'forceDeleteVenue');
    Route::get('/getVenueImage/{venue}', 'showVenueImage');
    Route::post('/uploadImage/{venue}', 'uploadImage');
});

Route::controller(EventController::class)->prefix('/events')->group(function() {
    Route::get('/loadEvents', 'loadEvents');
    Route::get('/getEvent/{event_id}', 'getEvent');
    Route::post('/storeEvent', 'storeEvent');
    Route::put('/updateEvent/{event}', 'updateEvent');
    Route::put('/destroyEvent/{event}', 'destroyEvent');
});

Route::controller(VehicleController::class)->prefix('/vehicles')->group(function() {
    Route::get('/loadVehicles', 'loadVehicles');
    Route::get('/getVehicle/{vehicle_id}', 'getVehicle');
    Route::post('/storeVehicle', 'storeVehicle');
    Route::put('/updateVehicle/{vehicle}', 'updateVehicle');
    Route::put('/destroyVehicle/{vehicle}', 'destroyVehicle');
    Route::get('/trash', 'loadTrashVehicles');
    Route::put('/restoreVehicle/{vehicle}', 'restoreVehicle');
    Route::delete('/forceDeleteVehicle/{vehicle}', 'forceDeleteVehicle');
    Route::get('/getVehicleImage/{vehicle}', 'showVehicleImage');
});

Route::controller(DriverController::class)->prefix('/drivers')->group(function() {
    Route::get('/loadDrivers', 'loadDrivers');
    Route::get('/getDriver/{driver_id}', 'getDriver');
    Route::post('/storeDriver', 'storeDriver');
    Route::put('/updateDriver/{driver}', 'updateDriver');
    Route::delete('/destroyDriver/{driver}', 'destroyDriver');
    Route::get('/loadTrashDrivers', 'loadTrashDrivers');
    Route::put('/restoreDriver/{driver}', 'restoreDriver');
    Route::delete('/forceDeleteDriver/{driver}', 'forceDeleteDriver');
});



// Route::get('/user', function (Request $request) {
//     return $request->user();
// })->middleware('auth:sanctum');
