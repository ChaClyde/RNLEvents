import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import SignatureService from "../../services/SignatureService";

const ProfilePage = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const status = await SignatureService.show();
    setHasSignature(status.data.data.has_signature);
    if (!status.data.data.has_signature) {
      setPreviewUrl("");
      return;
    }
    const image = await SignatureService.image();
    setPreviewUrl(URL.createObjectURL(image.data));
  };

  useEffect(() => {
    void load().catch(() => setError("Unable to load your e-signature."));
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // The preview URL is replaced inside load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDraw = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    drawing.current = true;
    canvas.setPointerCapture(event.pointerId);
    const cursor = point(event);
    context.strokeStyle = "#1E3A5F";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(cursor.x, cursor.y);
  };

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const cursor = point(event);
    context.lineTo(cursor.x, cursor.y);
    context.stroke();
  };

  const saveCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("The drawing could not be saved.");
      await SignatureService.save(new File([blob], "signature.png", { type: "image/png" }));
      setMessage("Your drawn signature was saved.");
      await load();
    } catch {
      setError("The signature could not be saved. Use a PNG or JPEG under 1 MB.");
    } finally {
      setBusy(false);
    }
  };

  const saveUpload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await SignatureService.save(file);
      setMessage("Your uploaded signature was saved.");
      await load();
    } catch {
      setError("Upload a PNG or JPEG signature no larger than 1 MB.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await SignatureService.remove();
      setHasSignature(false);
      setPreviewUrl("");
      setMessage("Your saved signature was removed. Approval records keep their own copies.");
    } catch {
      setError("The signature could not be removed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div>
        <p className="text-sm text-[#0095D9]">Filamer Christian University Inc.</p>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">My E-Signature</h1>
        <p className="mt-1 text-sm text-gray-500">
          This signature is used only when you approve an event booking. It is stored privately.
        </p>
      </div>

      {!hasSignature && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No e-signature is configured. You cannot approve an event booking until one is saved.
        </p>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Saved signature</h2>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Saved e-signature"
            className="mt-3 h-24 rounded-lg border border-gray-200 bg-white"
          />
        ) : (
          <p className="mt-3 text-sm text-gray-500">No signature preview yet.</p>
        )}
        <button
          type="button"
          disabled={busy || !hasSignature}
          onClick={() => void remove()}
          className="mt-3 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 disabled:opacity-40"
        >
          Remove signature
        </button>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Draw signature</h2>
        <canvas
          ref={canvasRef}
          width={640}
          height={180}
          className="mt-3 w-full touch-none rounded-xl border border-dashed border-[#0095D9] bg-white"
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={() => {
            drawing.current = false;
          }}
          onPointerLeave={() => {
            drawing.current = false;
          }}
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => canvasRef.current?.getContext("2d")?.clearRect(0, 0, 640, 180)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveCanvas()}
            className="rounded-xl bg-[#00679E] px-3 py-2 text-sm font-semibold text-white"
          >
            Save drawing
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Upload signature</h2>
        <p className="mt-1 text-sm text-gray-500">PNG or JPEG, up to 1 MB.</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          className="mt-3 block text-sm"
          onChange={(event) => void saveUpload(event.target.files?.[0])}
        />
      </section>

      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Link to="/" className="inline-block text-sm text-[#00679E]">
        Back to dashboard
      </Link>
    </div>
  );
};

export default ProfilePage;
