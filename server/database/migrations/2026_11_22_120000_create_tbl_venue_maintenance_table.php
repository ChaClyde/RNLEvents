<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tbl_venue_maintenance', function (Blueprint $table) {
            $table->id('maintenance_id');

            $table->foreignId('venue_id')
                ->constrained('tbl_venues', 'venue_id')
                ->cascadeOnDelete();

            $table->string('reason', 150);
            $table->text('notes')->nullable();
            $table->date('date_start');
            $table->date('date_end');
            $table->enum('status', [
                'scheduled',
                'completed',
                'cancelled',
            ])->default('scheduled');
            $table->timestamps();

            $table->index(
                ['venue_id', 'status', 'date_start', 'date_end'],
                'venue_maintenance_schedule_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_venue_maintenance');
    }
};
