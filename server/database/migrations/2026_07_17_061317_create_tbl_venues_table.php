<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tbl_venues', function (Blueprint $table) {
            $table->id('venue_id');

            // Basic Venue Information
            $table->string('venue', 100)->unique();
            $table->text('description')->nullable();
            $table->unsignedInteger('capacity');
            $table->string('location', 150);

            // Person in Charge Information
            $table->string('person_in_charge', 150)->nullable();
            $table->string('pic_contact_number', 30)->nullable();
            $table->string('pic_email', 255)->nullable();

            // Venue Image
            $table->string('venue_image')->nullable();

            // Venue Facilities
            $table->json('facilities')->nullable();

            // Overtime Information
            $table->decimal('overtime_rate', 10, 2)->default(0);
            $table->text('overtime_policy')->nullable();

            // Venue Status
            $table->enum('status', [
                'available',
                'unavailable',
            ])->default('available');

            // Soft Delete
            $table->boolean('is_deleted')->default(false);

            $table->timestamps();

            $table->index(['status', 'is_deleted']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_venues');
    }
};
