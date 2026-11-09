<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tbl_vehicles', function (Blueprint $table) {
            $table->id('vehicle_id');

            // Basic Information
            $table->string('vehicle_name', 100);
            $table->string('plate_number', 20)->unique();
            $table->string('vehicle_type', 100)->nullable();
            $table->text('description')->nullable();

            // Seating (integer so bookings can check passengers against it)
            $table->unsignedSmallInteger('capacity');
            $table->string('seating_notes', 150)->nullable(); // e.g. "Front seats only"

            // Person in Charge
            $table->string('person_in_charge', 150)->nullable();
            $table->string('pic_contact_number', 30)->nullable();
            $table->string('pic_email', 255)->nullable();

            // Availability
            $table->enum('status', [
                'available',
                'unavailable',
                'maintenance',
            ])->default('available');

            // Image (stored on the private "vehicles" disk)
            $table->string('image_path')->nullable();

            // Soft Delete
            $table->boolean('is_deleted')->default(false);

            $table->timestamps();

            $table->index(['status', 'is_deleted']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_vehicles');
    }
};
