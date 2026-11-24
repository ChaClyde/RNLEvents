<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tbl_announcements')) {
            return;
        }

        Schema::create('tbl_announcements', function (Blueprint $table) {
            $table->id('announcement_id');
            $table->foreignId('created_by')
                ->constrained('tbl_users', 'user_id')
                ->restrictOnDelete();
            $table->string('title', 150);
            $table->text('body');
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_announcements');
    }
};
