<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tbl_events', function (Blueprint $table) {
            $table->id('event_id');
            $table->string('purpose', 200);
            $table->foreignId('venue_id')->constrained('tbl_venues', 'venue_id');
            $table->time('time_start');
            $table->time('time_end');
            $table->date('date_start');
            $table->date('date_end');
            $table->unsignedInteger('number_of_days')->default(1);
            $table->string('status')->default('pending');

            // Things needed
            $table->unsignedInteger('chairs')->default(0);
            $table->unsignedInteger('tables')->default(0);
            $table->boolean('lights_and_sounds')->default(false);
            $table->boolean('multimedia_projector')->default(false);
            $table->string('others_specify', 150)->nullable();
            $table->unsignedInteger('others_quantity')->nullable();

            // Requestor
            $table->string('requested_by', 150);
            $table->foreignId('office_id')->constrained('tbl_offices', 'office_id');
            $table->string('email', 150);
            $table->string('tel_number', 30);

            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_events');
    }
};
