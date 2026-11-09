<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tbl_role_user', function (Blueprint $table) {
            $table->id('role_user_id');

            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('role_id');

            $table->timestamps();

            // User relationship
            $table->foreign('user_id')
                ->references('user_id')
                ->on('tbl_users')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            // Role relationship
            $table->foreign('role_id')
                ->references('role_id')
                ->on('tbl_roles')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            // Prevent duplicate role assignments
            $table->unique(
                ['user_id', 'role_id'],
                'tbl_role_user_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_role_user');
    }
};
