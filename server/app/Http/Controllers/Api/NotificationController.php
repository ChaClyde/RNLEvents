<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemNotification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->user_id;

        $notifications = SystemNotification::query()
            ->where('user_id', $userId)
            ->orderByDesc('notification_id')
            ->limit(20)
            ->get();

        $unread = SystemNotification::query()
            ->where('user_id', $userId)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'message' => 'Notifications loaded.',
            'unread_count' => $unread,
            'data' => $notifications->map(fn (SystemNotification $notification) => [
                'notification_id' => $notification->notification_id,
                'kind' => $notification->kind,
                'title' => $notification->title,
                'body' => $notification->body,
                'link' => $notification->link,
                'read_at' => $notification->read_at?->format('Y-m-d H:i'),
                'created_at' => $notification->created_at?->format('M j, Y g:i A'),
            ])->values(),
        ]);
    }

    public function markRead(Request $request, int $notification)
    {
        $record = SystemNotification::query()
            ->where('user_id', $request->user()->user_id)
            ->findOrFail($notification);

        if ($record->read_at === null) {
            $record->update(['read_at' => now()]);
        }

        return response()->json([
            'message' => 'Notification marked as read.',
        ]);
    }

    public function markAllRead(Request $request)
    {
        SystemNotification::query()
            ->where('user_id', $request->user()->user_id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => 'Notifications marked as read.',
        ]);
    }
}
