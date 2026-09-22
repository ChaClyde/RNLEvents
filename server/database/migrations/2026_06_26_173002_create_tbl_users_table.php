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
        Schema::create('tbl_users', function (Blueprint $table) {

            $table->id('user_id');

            $table->string('profile_photo',255)->nullable();

            $table->string('first_name',55);
            $table->string('middle_name',55)->nullable();
            $table->string('last_name',55);
            $table->string('suffix_name',10)->nullable();

            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();

            $table->string('username')->unique();
            $table->string('password');

            $table->unsignedBigInteger('role_id');
            $table->unsignedBigInteger('office_id');

            $table->enum('account_status',['Active','Inactive'])
                ->default('Active');

            $table->timestamp('last_login_at')->nullable();

            $table->boolean('is_deleted')->default(false);

            $table->timestamps();

            $table->foreign('role_id')
                ->references('role_id')
                ->on('tbl_roles')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->foreign('office_id')
                ->references('office_id')
                ->on('tbl_offices')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('tbl_users');
        Schema::enableForeignKeyConstraints();
    }
};
