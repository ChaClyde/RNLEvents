<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tbl_vehicles', function (Blueprint $table) {
            $table->id('vehicle_id');
            $table->string('vehicle_name');
            $table->string('vehicle_type')->nullable();
            $table->string('vehicle_maintenance')->nullable();
            $table->string('capacity')->nullable();
            $table->string('status')->default('available');
            $table->string('image_path')->nullable();
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tbl_vehicles');
    }
};
