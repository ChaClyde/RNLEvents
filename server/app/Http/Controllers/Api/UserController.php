<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Load all active users
     */
    public function loadUsers()
    {
        $users = User::with(['role', 'office'])
            ->where('is_deleted', false)
            ->get();

        return response()->json([
            'users' => $users
        ], 200);
    }

    /**
     * Create User
     */
    public function storeUser(Request $request)
    {
        $validated = $request->validate([
            'profile_photo' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048'
            ],

            'first_name' => [
                'required',
                'string',
                'min:5',
                'max:30',
                'regex:/^[A-Za-z\s]+$/'
            ],

            'middle_name' => [
                'nullable',
                'string',
                'min:5',
                'max:30',
                'regex:/^[A-Za-z\s]+$/'
            ],

            'last_name' => [
                'required',
                'string',
                'min:5',
                'max:30',
                'regex:/^[A-Za-z\s]+$/'
            ],

            'suffix_name' => [
                'nullable',
                'string',
                'max:10',
                'regex:/^[A-Za-z\s]+$/'
            ],

            'role_id' => [
                'required',
                'exists:tbl_roles,role_id'
            ],

            'office_id' => [
                'required',
                'exists:tbl_offices,office_id'
            ],

            'email' => [
                'required',
                'email',
                Rule::unique('tbl_users', 'email')
            ],

            'username' => [
                'required',
                'string',
                'min:5',
                'max:30',
                'alpha_dash',
                Rule::unique('tbl_users', 'username')
            ],

            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed'
            ],

            'account_status' => [
                'nullable',
                Rule::in(['Active', 'Inactive'])
            ],

        ], [

            'first_name.required' => 'First name is required.',
            'first_name.min' => 'First name must be at least 5 characters.',
            'first_name.max' => 'First name must not exceed 30 characters.',
            'first_name.regex' => 'First name may contain letters and spaces only.',

            'middle_name.min' => 'Middle name must be at least 5 characters.',
            'middle_name.max' => 'Middle name must not exceed 30 characters.',
            'middle_name.regex' => 'Middle name may contain letters and spaces only.',

            'last_name.required' => 'Last name is required.',
            'last_name.min' => 'Last name must be at least 5 characters.',
            'last_name.max' => 'Last name must not exceed 30 characters.',
            'last_name.regex' => 'Last name may contain letters and spaces only.',

            'suffix_name.max' => 'Suffix must not exceed 10 characters.',
            'suffix_name.regex' => 'Suffix may contain letters and spaces only.',

            'role_id.required' => 'Please select a role.',
            'role_id.exists' => 'Selected role is invalid.',

            'office_id.required' => 'Please select an office.',
            'office_id.exists' => 'Selected office is invalid.',

            'email.required' => 'Email address is required.',
            'email.email' => 'Please enter a valid email address.',
            'email.unique' => 'Email address already exists.',

            'username.required' => 'Username is required.',
            'username.min' => 'Username must be at least 5 characters.',
            'username.max' => 'Username must not exceed 30 characters.',
            'username.alpha_dash' => 'Username may only contain letters, numbers, dashes and underscores.',
            'username.unique' => 'Username already exists.',

            'password.required' => 'Password is required.',
            'password.min' => 'Password must be at least 8 characters.',
            'password.confirmed' => 'Password confirmation does not match.',

            'account_status.in' => 'Invalid account status.',

            'profile_photo.image' => 'Profile photo must be an image.',
            'profile_photo.mimes' => 'Profile photo must be JPG, JPEG, PNG or WEBP.',
            'profile_photo.max' => 'Profile photo must not exceed 2MB.',
        ]);

        $photoPath = null;

        if ($request->hasFile('profile_photo')) {
            $photoPath = $request->file('profile_photo')->store('', 'profile_photos');
        }

        $user = User::create([
            'profile_photo' => $photoPath,
            'first_name' => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'last_name' => $validated['last_name'],
            'suffix_name' => $validated['suffix_name'] ?? null,
            'email' => $validated['email'],
            'username' => $validated['username'],
            'password' => Hash::make($validated['password']),
            'role_id' => $validated['role_id'],
            'office_id' => $validated['office_id'],
            'account_status' => $validated['account_status'] ?? 'Active',
        ]);

        return response()->json([
            'message' => 'User successfully created.',
            'user' => $user->load(['role', 'office'])
        ], 201);
    }

    /**
     * Get Single User
     */
    public function getUser($user_id)
    {
        $user = User::with(['role', 'office'])
            ->findOrFail($user_id);

        return response()->json([
            'user' => $user
        ], 200);
    }

    /**
     * Update User
     */
    public function updateUser(Request $request, User $user)
    {
        $validated = $request->validate([

            'first_name' => [
                'required',
                'string',
                'min:5',
                'max:30',
                'regex:/^[A-Za-z\s]+$/'
            ],

            'middle_name' => [
                'nullable',
                'string',
                'min:5',
                'max:30',
                'regex:/^[A-Za-z\s]+$/'
            ],

            'last_name' => [
                'required',
                'string',
                'min:5',
                'max:30',
                'regex:/^[A-Za-z\s]+$/'
            ],

            'suffix_name' => [
                'nullable',
                'string',
                'max:10',
                'regex:/^[A-Za-z\s]+$/'
            ],

            'role_id' => [
                'required',
                'exists:tbl_roles,role_id'
            ],

            'office_id' => [
                'required',
                'exists:tbl_offices,office_id'
            ],

            'email' => [
                'required',
                'email',
                Rule::unique('tbl_users', 'email')
                    ->ignore($user->user_id, 'user_id')
            ],

            'username' => [
                'required',
                'string',
                'min:5',
                'max:30',
                'alpha_dash',
                Rule::unique('tbl_users', 'username')
                    ->ignore($user->user_id, 'user_id')
            ],

            'account_status' => [
                'required',
                Rule::in(['Active', 'Inactive'])
            ]

        ]);

        $user->update([
            'first_name' => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'last_name' => $validated['last_name'],
            'suffix_name' => $validated['suffix_name'] ?? null,
            'email' => $validated['email'],
            'username' => $validated['username'],
            'role_id' => $validated['role_id'],
            'office_id' => $validated['office_id'],
            'account_status' => $validated['account_status'],
        ]);

        return response()->json([
            'message' => 'User successfully updated.',
            'user' => $user->fresh(['role', 'office'])
        ], 200);
    }

    /**
     * Move User to Trash
     */
    public function destroyUser(Request $request, User $user)
    {
        $user->update([
            'is_deleted' => true
        ]);

        return response()->json([
            'message' => 'User successfully deleted.'
        ], 200);
    }

    /**
     * Load Trash Users
     */
    public function loadTrashUsers()
    {
        $users = User::with(['role', 'office'])
            ->where('is_deleted', true)
            ->get();

        return response()->json([
            'users' => $users
        ], 200);
    }

    /**
     * Restore User
     */
    public function restoreUser(Request $request, User $user)
    {
        if (!$user->is_deleted) {
            return response()->json([
                'message' => 'This user is already active.'
            ], 422);
        }

        $user->update([
            'is_deleted' => false
        ]);

        return response()->json([
            'message' => 'User restored successfully.',
            'user' => $user->fresh(['role', 'office'])
        ], 200);
    }

    /**
     * Permanently Delete User
     */
    public function forceDeleteUser(Request $request, User $user)
    {
        if (!$user->is_deleted) {
            return response()->json([
                'message' => 'Only deleted users can be permanently removed.'
            ], 422);
        }

        if ($user->profile_photo && Storage::disk('profile_photos')->exists($user->profile_photo)) {
            Storage::disk('profile_photos')->delete($user->profile_photo);
        }

        $user->delete();

        return response()->json([
            'message' => 'User permanently deleted.'
        ], 200);
    }

    /**
     * Upload Profile Photo
     */
    public function uploadProfilePhoto(Request $request, User $user)
    {
        $validated = $request->validate([
            'profile_photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048']
        ], [
            'profile_photo.required' => 'Please select a profile photo.',
            'profile_photo.image' => 'The selected file must be an image.',
            'profile_photo.mimes' => 'Only JPG, JPEG, PNG, and WEBP images are allowed.',
            'profile_photo.max' => 'The profile photo must not exceed 2MB.',
        ]);

        if ($user->profile_photo && Storage::disk('profile_photos')->exists($user->profile_photo)) {
            Storage::disk('profile_photos')->delete($user->profile_photo);
        }

        $path = $request->file('profile_photo')->store('', 'profile_photos');

        $user->update(['profile_photo' => $path]);

        return response()->json([
            'message' => 'Profile photo updated successfully.',
            'user' => $user->fresh(['role', 'office']),
        ], 200);
    }

    /**
     * Stream a user's profile photo (private disk)
     */
    public function showProfilePhoto(User $user)
    {
        if (!$user->profile_photo || !Storage::disk('profile_photos')->exists($user->profile_photo)) {
            abort(404);
        }

        return Storage::disk('profile_photos')->response($user->profile_photo);
    }

    /**
     * Remove Profile Photo
     */
    public function removeProfilePhoto(Request $request, User $user)
    {
        if ($user->profile_photo && Storage::disk('profile_photos')->exists($user->profile_photo)) {
            Storage::disk('profile_photos')->delete($user->profile_photo);
        }

        $user->update(['profile_photo' => null]);

        return response()->json(['message' => 'Profile photo removed successfully.'], 200);
    }

    /**
     * Update Own Profile
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([

            'first_name' => [
                'required',
                'string',
                'min:5',
                'max:30',
                'regex:/^[A-Za-z\s]+$/'
            ],

            'middle_name' => [
                'nullable',
                'string',
                'min:5',
                'max:30',
                'regex:/^[A-Za-z\s]+$/'
            ],

            'last_name' => [
                'required',
                'string',
                'min:5',
                'max:30',
                'regex:/^[A-Za-z\s]+$/'
            ],

            'suffix_name' => [
                'nullable',
                'string',
                'max:10',
                'regex:/^[A-Za-z\s]+$/'
            ],

            'email' => [
                'required',
                'email',
                Rule::unique('tbl_users', 'email')
                    ->ignore($user->user_id, 'user_id')
            ],

            'username' => [
                'required',
                'string',
                'min:5',
                'max:30',
                'alpha_dash',
                Rule::unique('tbl_users', 'username')
                    ->ignore($user->user_id, 'user_id')
            ],

            'current_password' => [
                'nullable',
                'required_with:new_password',
            ],

            'new_password' => [
                'nullable',
                'string',
                'min:8',
                'confirmed'
            ],

            'new_password_confirmation' => [
                'nullable'
            ]

        ], [

            'first_name.required' => 'First name is required.',
            'first_name.min' => 'First name must be at least 5 characters.',
            'first_name.max' => 'First name must not exceed 30 characters.',
            'first_name.regex' => 'First name may contain letters and spaces only.',

            'middle_name.min' => 'Middle name must be at least 5 characters.',
            'middle_name.max' => 'Middle name must not exceed 30 characters.',
            'middle_name.regex' => 'Middle name may contain letters and spaces only.',

            'last_name.required' => 'Last name is required.',
            'last_name.min' => 'Last name must be at least 5 characters.',
            'last_name.max' => 'Last name must not exceed 30 characters.',
            'last_name.regex' => 'Last name may contain letters and spaces only.',

            'suffix_name.max' => 'Suffix must not exceed 10 characters.',
            'suffix_name.regex' => 'Suffix may contain letters and spaces only.',

            'email.required' => 'Email address is required.',
            'email.email' => 'Please enter a valid email address.',
            'email.unique' => 'Email address already exists.',

            'username.required' => 'Username is required.',
            'username.min' => 'Username must be at least 5 characters.',
            'username.max' => 'Username must not exceed 30 characters.',
            'username.unique' => 'Username already exists.',

            'current_password.required_with' => 'Current password is required.',

            'new_password.min' => 'New password must be at least 8 characters.',
            'new_password.confirmed' => 'Password confirmation does not match.',
        ]);

        if (!empty($validated['new_password'])) {
            if (!Hash::check($validated['current_password'], $user->password)) {
                return response()->json([
                    'message' => 'Current password is incorrect.'
                ], 422);
            }

            $user->password = Hash::make($validated['new_password']);
        }

        $user->update([
            'first_name' => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'last_name' => $validated['last_name'],
            'suffix_name' => $validated['suffix_name'] ?? null,
            'email' => $validated['email'],
            'username' => $validated['username'],
        ]);

        if (!empty($validated['new_password'])) {
            $user->save();
        }

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $user->fresh(['role', 'office'])
        ], 200);
    }
}
