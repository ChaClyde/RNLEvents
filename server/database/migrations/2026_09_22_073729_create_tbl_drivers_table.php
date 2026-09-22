<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tbl_drivers', function (Blueprint $table) {
            $table->id('driver_id');

            $table->string('driver_name', 100);

            $table->enum('driver_status', ['Available', 'On Leave', 'Sick Leave', 'Unavailable'])
                ->default('Available');

            $table->string('status_remarks', 255)->nullable();

            $table->boolean('is_deleted')->default(false);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_drivers');
    }
};
