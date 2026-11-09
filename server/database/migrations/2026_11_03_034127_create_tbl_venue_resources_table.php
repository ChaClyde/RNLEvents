<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tbl_venue_resources', function (Blueprint $table) {
            $table->id('resource_id');

            // Parent Venue
            $table->foreignId('venue_id')
                ->constrained('tbl_venues', 'venue_id')
                ->cascadeOnDelete();

            // Resource Information
            $table->string('resource_name', 100);

            // NULL = quantity not confirmed
            // 0 = none currently recorded
            $table->unsignedInteger('total_quantity')->nullable();

            // Resource Availability
            $table->enum('availability_type', [
                'available',
                'consult_required',
                'borrowed',
            ])->default('available');

            // Physical Condition
            $table->enum('condition', [
                'good',
                'fair',
                'damaged',
                'not_applicable',
            ])->default('not_applicable');

            // Office to Coordinate With
            $table->string('coordination_office', 100)->nullable();

            // Additional Information
            $table->text('notes')->nullable();

            $table->timestamps();

            // Prevent duplicate resource names per venue
            $table->unique(
                ['venue_id', 'resource_name'],
                'venue_resource_unique'
            );

            $table->index([
                'venue_id',
                'availability_type',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_venue_resources');
    }
};
