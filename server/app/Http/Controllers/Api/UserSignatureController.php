<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Signatures\SignatureStorage;
use Illuminate\Http\Request;

class UserSignatureController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'message' => 'E-signature status loaded.',
            'data' => [
                'has_signature' => filled($user->signature_path),
                'mime_type' => $user->signature_mime,
                'updated_at' => $user->updated_at,
            ],
        ]);
    }

    public function image(Request $request)
    {
        return SignatureStorage::userResponse($request->user());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'signature' => [
                'required',
                'file',
                'image',
                'mimes:png,jpg,jpeg',
                'max:'.SignatureStorage::MAX_KILOBYTES,
            ],
        ]);

        SignatureStorage::storeUserSignature($request->user(), $validated['signature']);

        return response()->json([
            'message' => 'E-signature saved.',
            'data' => [
                'has_signature' => true,
                'mime_type' => $request->user()->fresh()->signature_mime,
            ],
        ]);
    }

    public function destroy(Request $request)
    {
        SignatureStorage::deleteUserSignature($request->user());

        return response()->json([
            'message' => 'E-signature removed.',
            'data' => [
                'has_signature' => false,
                'mime_type' => null,
            ],
        ]);
    }
}
