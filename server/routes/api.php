<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\OfficeController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VenueController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\EventBookingController;
use App\Http\Controllers\Api\VehicleBookingController;
use App\Http\Controllers\Api\AvailabilityController;
use App\Http\Controllers\Api\CalendarController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EventReportController;
use App\Http\Controllers\Api\VehicleReportController;
use App\Http\Controllers\Api\AuthController;


// ============================================================
// AUTHENTICATION (public login + authenticated session)
// ============================================================

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me'])
            ->middleware('active.account');
    });
});


Route::middleware(['auth:sanctum', 'active.account'])->group(function () {

    Route::get('/dashboard', [DashboardController::class, 'show'])
        ->middleware('permission:dashboard.view');

    Route::prefix('reports/events')->middleware('permission:reports.view')->group(function () {
        Route::get('/summary', [EventReportController::class, 'summary']);
        Route::get('/trends', [EventReportController::class, 'trends']);
        Route::get('/venues', [EventReportController::class, 'venues']);
        Route::get('/offices', [EventReportController::class, 'offices']);
        Route::get('/bookings', [EventReportController::class, 'bookings']);
        Route::get('/export/pdf', [EventReportController::class, 'exportPdf']);
        Route::get('/export/excel', [EventReportController::class, 'exportExcel']);
    });

    Route::prefix('reports/vehicles')->middleware('permission:reports.view')->group(function () {
        Route::get('/summary', [VehicleReportController::class, 'summary']);
        Route::get('/trends', [VehicleReportController::class, 'trends']);
        Route::get('/utilization', [VehicleReportController::class, 'utilization']);
        Route::get('/drivers', [VehicleReportController::class, 'drivers']);
        Route::get('/offices', [VehicleReportController::class, 'offices']);
        Route::get('/bookings', [VehicleReportController::class, 'bookings']);
        Route::get('/export/pdf', [VehicleReportController::class, 'exportPdf']);
        Route::get('/export/excel', [VehicleReportController::class, 'exportExcel']);
    });

    // ============================================================
    // ROLE MANAGEMENT
    // ============================================================

    Route::controller(RoleController::class)
        ->prefix('roles')
        ->group(function () {
            Route::get('/loadRoles', 'loadRoles')
                ->middleware('permission:roles.view');
            Route::get('/getRole/{role}', 'getRole')
                ->middleware('permission:roles.view');

            Route::post('/storeRole', 'storeRole')
                ->middleware('permission:roles.create');
            Route::put('/updateRole/{role}', 'updateRole')
                ->middleware('permission:roles.edit');

            Route::put('/activateRole/{role}', 'activateRole')
                ->middleware('permission:roles.edit');
            Route::put('/deactivateRole/{role}', 'deactivateRole')
                ->middleware('permission:roles.edit');

            Route::delete('/destroyRole/{role}', 'destroyRole')
                ->middleware('permission:roles.delete');

            Route::get('/trash', 'loadTrashRoles')
                ->middleware('permission:trash.view');
            Route::put('/restoreRole/{role}', 'restoreRole')
                ->middleware('permission:trash.restore');
            Route::delete('/forceDeleteRole/{role}', 'forceDeleteRole')
                ->middleware('permission:trash.force_delete');
        });


    // ============================================================
    // OFFICE MANAGEMENT
    // ============================================================

    Route::controller(OfficeController::class)
        ->prefix('offices')
        ->group(function () {
            Route::get('/loadOffices', 'loadOffices')
                ->middleware('permission:offices.view');
            Route::get('/getOffice/{office}', 'getOffice')
                ->middleware('permission:offices.view');

            Route::post('/storeOffice', 'storeOffice')
                ->middleware('permission:offices.create');
            Route::put('/updateOffice/{office}', 'updateOffice')
                ->middleware('permission:offices.edit');

            Route::put('/activateOffice/{office}', 'activateOffice')
                ->middleware('permission:offices.edit');
            Route::put('/deactivateOffice/{office}', 'deactivateOffice')
                ->middleware('permission:offices.edit');

            Route::delete('/destroyOffice/{office}', 'destroyOffice')
                ->middleware('permission:offices.delete');

            Route::get('/trash', 'loadTrashOffices')
                ->middleware('permission:trash.view');
            Route::put('/restoreOffice/{office}', 'restoreOffice')
                ->middleware('permission:trash.restore');
            Route::delete('/forceDeleteOffice/{office}', 'forceDeleteOffice')
                ->middleware('permission:trash.force_delete');
        });


    // ============================================================
    // USER MANAGEMENT
    // ============================================================

    Route::controller(UserController::class)
        ->prefix('users')
        ->group(function () {
            Route::get('/loadUsers', 'loadUsers')
                ->middleware('permission:users.view');
            Route::get('/getUser/{user_id}', 'getUser')
                ->middleware('permission:users.view');

            Route::post('/storeUser', 'storeUser')
                ->middleware('permission:users.create');
            Route::put('/updateUser/{user}', 'updateUser')
                ->middleware('permission:users.edit');

            Route::put('/resetPassword/{user}', 'resetPassword')
                ->middleware('permission:users.edit');

            Route::delete('/destroyUser/{user}', 'destroyUser')
                ->middleware('permission:users.delete');

            Route::get('/trash', 'loadTrashUsers')
                ->middleware('permission:trash.view');
            Route::put('/restoreUser/{user}', 'restoreUser')
                ->middleware('permission:trash.restore');
            Route::delete('/forceDeleteUser/{user}', 'forceDeleteUser')
                ->middleware('permission:trash.force_delete');

            Route::post('/uploadProfilePhoto/{user}', 'uploadProfilePhoto')
                ->middleware('permission:users.edit,self');
            Route::get('/getProfilePhoto/{user}', 'showProfilePhoto')
                ->middleware('permission:users.view,self');
            Route::delete('/removeProfilePhoto/{user}', 'removeProfilePhoto')
                ->middleware('permission:users.edit,self');

            Route::put('/updateProfile', 'updateProfile');
        });


    // ============================================================
    // VENUE MANAGEMENT
    // ============================================================

    Route::controller(VenueController::class)
        ->prefix('venues')
        ->group(function () {
            Route::get('/loadVenues', 'loadVenues')
                ->middleware('permission:venues.view');
            Route::get('/getVenue/{venue_id}', 'getVenue')
                ->middleware('permission:venues.view');

            Route::post('/storeVenue', 'storeVenue')
                ->middleware('permission:venues.create');
            Route::put('/updateVenue/{venue_id}', 'updateVenue')
                ->middleware('permission:venues.edit');

            Route::delete('/destroyVenue/{venue_id}', 'destroyVenue')
                ->middleware('permission:venues.delete');

            Route::get('/trash', 'loadTrashVenues')
                ->middleware('permission:trash.view');
            Route::put('/restoreVenue/{venue_id}', 'restoreVenue')
                ->middleware('permission:trash.restore');
            Route::delete('/forceDeleteVenue/{venue_id}', 'forceDeleteVenue')
                ->middleware('permission:trash.force_delete');

            Route::get('/getVenueImage/{venue_id}', 'showVenueImage')
                ->middleware('permission:venues.view');
            Route::delete('/removeVenueImage/{venue_id}', 'removeVenueImage')
                ->middleware('permission:venues.edit');
        });


    // ============================================================
    // EVENT MANAGEMENT
    // ============================================================

    Route::controller(EventController::class)
        ->prefix('events')
        ->group(function () {
            Route::get('/loadEvents', 'loadEvents')
                ->middleware('permission:events.view');
            Route::get('/getEvent/{event_id}', 'getEvent')
                ->middleware('permission:events.view');

            Route::post('/storeEvent', 'storeEvent')
                ->middleware('permission:events.create');
            Route::put('/updateEvent/{event}', 'updateEvent')
                ->middleware('permission:events.edit');

            Route::put('/destroyEvent/{event}', 'destroyEvent')
                ->middleware('permission:events.delete');
        });


    // ============================================================
    // VEHICLE MANAGEMENT
    // ============================================================

    Route::controller(VehicleController::class)
        ->prefix('vehicles')
        ->group(function () {
            Route::get('/loadVehicles', 'loadVehicles')
                ->middleware('permission:vehicles.view');
            Route::get('/getVehicle/{vehicle_id}', 'getVehicle')
                ->middleware('permission:vehicles.view');

            Route::post('/storeVehicle', 'storeVehicle')
                ->middleware('permission:vehicles.create');
            Route::put('/updateVehicle/{vehicle_id}', 'updateVehicle')
                ->middleware('permission:vehicles.edit');

            Route::delete('/destroyVehicle/{vehicle_id}', 'destroyVehicle')
                ->middleware('permission:vehicles.delete');

            Route::get('/trash', 'loadTrashVehicles')
                ->middleware('permission:trash.view');
            Route::put('/restoreVehicle/{vehicle_id}', 'restoreVehicle')
                ->middleware('permission:trash.restore');
            Route::delete('/forceDeleteVehicle/{vehicle_id}', 'forceDeleteVehicle')
                ->middleware('permission:trash.force_delete');

            Route::get('/getVehicleImage/{vehicle_id}', 'showVehicleImage')
                ->middleware('permission:vehicles.view');
        });


    // ============================================================
    // DRIVER MANAGEMENT
    // ============================================================

    Route::controller(DriverController::class)
        ->prefix('drivers')
        ->group(function () {
            Route::get('/loadDrivers', 'loadDrivers')
                ->middleware('permission:drivers.view');
            Route::get('/getDriver/{driver_id}', 'getDriver')
                ->middleware('permission:drivers.view');

            Route::post('/storeDriver', 'storeDriver')
                ->middleware('permission:drivers.create');
            Route::put('/updateDriver/{driver_id}', 'updateDriver')
                ->middleware('permission:drivers.edit');

            Route::delete('/destroyDriver/{driver_id}', 'destroyDriver')
                ->middleware('permission:drivers.delete');

            Route::get('/trash', 'loadTrashDrivers')
                ->middleware('permission:trash.view');
            Route::put('/restoreDriver/{driver_id}', 'restoreDriver')
                ->middleware('permission:trash.restore');
            Route::delete('/forceDeleteDriver/{driver_id}', 'forceDeleteDriver')
                ->middleware('permission:trash.force_delete');
        });


    // ============================================================
    // EVENT BOOKING MANAGEMENT
    // ============================================================

    Route::controller(EventBookingController::class)
        ->prefix('event-bookings')
        ->group(function () {
            Route::get('/', 'loadEventBookings')
                ->middleware('permission:event_bookings.view,or:event_approvals.view');
            Route::get('/trash', 'loadTrash')
                ->middleware('permission:trash.view');
            Route::get('/{event_booking_id}', 'getEventBooking')
                ->whereNumber('event_booking_id')
                ->middleware('permission:event_bookings.view,or:event_approvals.view');

            Route::post('/storeEventBooking', 'storeEventBooking')
                ->middleware('permission:event_bookings.create,bypassable');
            Route::put('/updateEventBooking/{event_booking_id}', 'updateEventBooking')
                ->middleware('permission:event_bookings.edit');
            Route::delete('/destroyEventBooking/{event_booking_id}', 'destroyEventBooking')
                ->middleware('permission:event_bookings.delete');

            Route::put('/updateStatus/{event_booking_id}', 'updateEventBookingStatus');

            Route::put('/restoreEventBooking/{event_booking_id}', 'restoreEventBooking')
                ->middleware('permission:trash.restore');
            Route::delete('/forceDeleteEventBooking/{event_booking_id}', 'forceDeleteEventBooking')
                ->middleware('permission:trash.force_delete');
        });


    // ============================================================
    // VEHICLE BOOKING MANAGEMENT
    // ============================================================

    Route::controller(VehicleBookingController::class)
        ->prefix('vehicle-bookings')
        ->group(function () {
            Route::get('/', 'loadVehicleBookings')
                ->middleware('permission:vehicle_bookings.view,or:vehicle_approvals.view');
            Route::get('/trash', 'loadTrash')
                ->middleware('permission:trash.view');
            Route::get('/{vehicle_booking_id}', 'getVehicleBooking')
                ->whereNumber('vehicle_booking_id')
                ->middleware('permission:vehicle_bookings.view,or:vehicle_approvals.view');

            Route::post('/storeVehicleBooking', 'storeVehicleBooking')
                ->middleware('permission:vehicle_bookings.create,bypassable');
            Route::put('/updateVehicleBooking/{vehicle_booking_id}', 'updateVehicleBooking')
                ->middleware('permission:vehicle_bookings.edit');
            Route::delete('/destroyVehicleBooking/{vehicle_booking_id}', 'destroyVehicleBooking')
                ->middleware('permission:vehicle_bookings.delete');

            Route::put('/updateStatus/{vehicle_booking_id}', 'updateVehicleBookingStatus');
            Route::put('/assign/{vehicle_booking_id}', 'assignVehicleBooking');

            Route::put('/restoreVehicleBooking/{vehicle_booking_id}', 'restoreVehicleBooking')
                ->middleware('permission:trash.restore');
            Route::delete('/forceDeleteVehicleBooking/{vehicle_booking_id}', 'forceDeleteVehicleBooking')
                ->middleware('permission:trash.force_delete');
        });


    // ============================================================
    // AVAILABILITY AND CALENDAR
    // ============================================================

    Route::prefix('availability')->group(function () {
        Route::get('/venues', [AvailabilityController::class, 'venues'])
            ->middleware('permission:event_bookings.create,or:event_bookings.view,or:event_approvals.view,bypassable');
        Route::get('/vehicles', [AvailabilityController::class, 'vehicles'])
            ->middleware('permission:vehicle_bookings.view,or:vehicle_approvals.view,or:vehicles.view');
        Route::get('/drivers', [AvailabilityController::class, 'drivers'])
            ->middleware('permission:vehicle_bookings.view,or:vehicle_approvals.view,or:drivers.view');
    });

    Route::get('/calendar', [CalendarController::class, 'index'])
        ->middleware('permission:event_bookings.view,or:vehicle_bookings.view,or:event_approvals.view,or:vehicle_approvals.view,or:events.view');
});
