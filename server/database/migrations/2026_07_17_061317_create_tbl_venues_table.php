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
        Schema::create('tbl_venues', function (Blueprint $table) {
            $table->id('venue_id');
            $table->string('venue',100);
            $table->text('description')->nullable();
            $table->integer('capacity');
            $table->string('location',150);
            $table->string('venue_image')->nullable();
            $table->string('status')->default('available');
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tbl_venues');
    }
};
