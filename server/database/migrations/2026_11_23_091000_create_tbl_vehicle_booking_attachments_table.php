<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tbl_vehicle_booking_attachments')) {
            return;
        }

        Schema::create('tbl_vehicle_booking_attachments', function (Blueprint $table) {
            $table->id('attachment_id');
            $table->foreignId('vehicle_booking_id')
                ->constrained('tbl_vehicle_bookings', 'vehicle_booking_id')
                ->cascadeOnDelete();
            $table->foreignId('uploaded_by')
                ->constrained('tbl_users', 'user_id')
                ->restrictOnDelete();
            $table->string('original_filename', 255);
            $table->string('stored_path', 255);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->string('attachment_type', 50)->default('letter_of_request');
            $table->timestamps();
            $table->unique(['vehicle_booking_id', 'attachment_type'], 'vba_booking_type_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_vehicle_booking_attachments');
    }
};
