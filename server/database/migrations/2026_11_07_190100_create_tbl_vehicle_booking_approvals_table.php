<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tbl_vehicle_booking_approvals')) {
            return;
        }

        Schema::create('tbl_vehicle_booking_approvals', function (Blueprint $table) {
            $table->id('vehicle_booking_approval_id');

            $table->foreignId('vehicle_booking_id')
                ->constrained('tbl_vehicle_bookings', 'vehicle_booking_id')
                ->cascadeOnDelete();

            $table->foreignId('approver_user_id')
                ->constrained('tbl_users', 'user_id')
                ->restrictOnDelete();

            $table->string('approval_stage', 100);
            $table->string('action', 20);
            $table->text('remarks')->nullable();

            $table->timestamps();

            $table->unique(
                ['vehicle_booking_id', 'approval_stage'],
                'vehicle_booking_stage_decision_unique'
            );
            $table->index(['approver_user_id', 'action']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_vehicle_booking_approvals');
    }
};
