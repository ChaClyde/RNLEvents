<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    // Fixed slugs of the 8 system roles.
    // Use these in middleware and policies instead of hardcoded strings.
    public const SUPER_ADMIN            = 'super-admin';
    public const EVENT_ADMIN            = 'event-admin';
    public const VEHICLE_ADMIN          = 'vehicle-admin';
    public const EVENT_APPROVAL_ADMIN   = 'event-approval-admin';
    public const VEHICLE_APPROVAL_ADMIN = 'vehicle-approval-admin';
    public const DEAN_OFFICE_HEAD       = 'dean-office-head';
    public const FACULTY_STAFF          = 'faculty-staff';
    public const STUDENT_REPUBLIC       = 'student-republic';

    public const SYSTEM_SLUGS = [
        self::SUPER_ADMIN,
        self::EVENT_ADMIN,
        self::VEHICLE_ADMIN,
        self::EVENT_APPROVAL_ADMIN,
        self::VEHICLE_APPROVAL_ADMIN,
        self::DEAN_OFFICE_HEAD,
        self::FACULTY_STAFF,
        self::STUDENT_REPUBLIC,
    ];

    protected $table = 'tbl_roles';

    protected $primaryKey = 'role_id';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'status',
        'is_system_role',
        'is_deleted',
    ];

    protected $casts = [
        'is_system_role' => 'boolean',
        'is_deleted' => 'boolean',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'role_id', 'role_id')
            ->where('is_deleted', false);
    }

    // Renamed from scopeActive(): it returns roles NOT in the Trash Bin
    // (both 'active' and 'inactive' status), so "active" was misleading.
    public function scopeNotDeleted($query)
    {
        return $query->where('is_deleted', false);
    }

    public function scopeDeleted($query)
    {
        return $query->where('is_deleted', true);
    }

    // Roles that can actually be used (not trashed and status = active).
    public function scopeUsable($query)
    {
        return $query->where('is_deleted', false)
            ->where('status', 'active');
    }
}
