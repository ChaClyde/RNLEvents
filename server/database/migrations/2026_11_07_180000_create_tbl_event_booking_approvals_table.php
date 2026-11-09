<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tbl_event_booking_approvals', function (Blueprint $table) {
            $table->id('event_booking_approval_id');

            $table->foreignId('event_booking_id')
                ->constrained('tbl_event_bookings', 'event_booking_id')
                ->cascadeOnDelete();

            $table->foreignId('approver_user_id')
                ->constrained('tbl_users', 'user_id')
                ->restrictOnDelete();

            $table->string('approval_stage', 100);
            $table->string('action', 20);
            $table->text('remarks')->nullable();

            $table->timestamps();

            $table->unique(
                ['event_booking_id', 'approval_stage'],
                'event_booking_stage_decision_unique'
            );
            $table->index(['approver_user_id', 'action']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_event_booking_approvals');
    }
};
