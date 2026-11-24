<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AnnouncementController extends Controller
{
    public function index(Request $request)
    {
        $announcements = Announcement::query()
            ->with(['author.role'])
            ->where('is_deleted', false)
            ->orderByDesc('created_at')
            ->orderByDesc('announcement_id')
            ->limit(50)
            ->get();

        return response()->json([
            'message' => 'Announcements loaded.',
            'can_publish' => $this->canPublish($request->user()),
            'data' => $announcements->map(fn (Announcement $announcement) => $this->present($announcement))->values(),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($this->canPublish($request->user()), 403, 'This action is unauthorized.');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $title = trim($validated['title']);
        $body = trim($validated['body']);
        if ($title === '' || $body === '') {
            throw ValidationException::withMessages([
                'title' => ['Write a title and a message before posting.'],
            ]);
        }

        $announcement = Announcement::query()->create([
            'created_by' => $request->user()->user_id,
            'title' => $title,
            'body' => $body,
            'is_deleted' => false,
        ]);

        $announcement->load('author.role');

        app(\App\Notifications\SystemNotifier::class)->announcementPosted($announcement, $request->user());

        return response()->json([
            'message' => 'Announcement posted.',
            'data' => $this->present($announcement),
        ], 201);
    }

    public function destroy(Request $request, int $announcement)
    {
        abort_unless($this->canPublish($request->user()), 403, 'This action is unauthorized.');

        $record = Announcement::query()
            ->where('is_deleted', false)
            ->findOrFail($announcement);

        $record->update(['is_deleted' => true]);

        return response()->json([
            'message' => 'Announcement removed.',
        ]);
    }

    private function canPublish(User $user): bool
    {
        $user->loadMissing('role');

        return in_array($user->role?->slug, [
            Role::SUPER_ADMIN,
            Role::EVENT_ADMIN,
            Role::VEHICLE_ADMIN,
        ], true);
    }

    private function present(Announcement $announcement): array
    {
        return [
            'announcement_id' => $announcement->announcement_id,
            'title' => $announcement->title,
            'body' => $announcement->body,
            'author_name' => $announcement->author?->full_name,
            'author_role' => $announcement->author?->role?->name,
            'created_at' => $announcement->created_at?->format('M j, Y g:i A'),
        ];
    }
}
