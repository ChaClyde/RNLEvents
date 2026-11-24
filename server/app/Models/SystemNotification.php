<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SystemNotification extends Model
{
    protected $table = 'tbl_notifications';

    protected $primaryKey = 'notification_id';

    protected $fillable = [
        'user_id',
        'kind',
        'title',
        'body',
        'link',
        'read_at',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'read_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
}
