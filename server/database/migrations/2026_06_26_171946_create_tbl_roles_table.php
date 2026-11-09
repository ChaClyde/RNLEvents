<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tbl_roles', function (Blueprint $table) {
            $table->id('role_id');

            // Role Information
            $table->string('name', 100)->unique();
            $table->string('slug', 100)->unique();
            $table->text('description')->nullable();

            // Status
            $table->enum('status', ['active', 'inactive'])
                ->default('active');

            // System Role Protection
            $table->boolean('is_system_role')
                ->default(false);

            // Timestamps
            $table->timestamps();

            // Soft Delete
            $table->boolean('is_deleted')
                ->default(false);

            // Indexes
            $table->index('status');
            $table->index('is_deleted');
            $table->index('is_system_role');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_roles');
    }
};
