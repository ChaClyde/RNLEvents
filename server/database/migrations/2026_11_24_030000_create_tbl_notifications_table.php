<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tbl_notifications')) {
            return;
        }

        Schema::create('tbl_notifications', function (Blueprint $table) {
            $table->id('notification_id');
            $table->foreignId('user_id')
                ->constrained('tbl_users', 'user_id')
                ->cascadeOnDelete();
            $table->string('kind', 40);
            $table->string('title', 150);
            $table->string('body', 500);
            $table->string('link', 150)->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'read_at'], 'notifications_user_unread_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_notifications');
    }
};
