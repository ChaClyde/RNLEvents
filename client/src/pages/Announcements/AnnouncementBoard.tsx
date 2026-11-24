import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone } from "lucide-react";
import AnnouncementService, {
  type Announcement,
} from "../../services/AnnouncementService";

const AnnouncementBoard = ({
  limit,
  showComposer = false,
}: {
  limit?: number;
  showComposer?: boolean;
}) => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [canPublish, setCanPublish] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await AnnouncementService.list();
    setCanPublish(response.data.can_publish);
    setItems(response.data.data);
  }, []);

  useEffect(() => {
    void load().catch(() => setError("Unable to load announcements."));
  }, [load]);

  const post = async () => {
    if (!title.trim() || !body.trim() || saving) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      await AnnouncementService.create({ title: title.trim(), body: body.trim() });
      setTitle("");
      setBody("");
      await load();
    } catch {
      setError("The announcement was not posted.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    setError("");
    try {
      await AnnouncementService.remove(id);
      await load();
    } catch {
      setError("The announcement was not removed.");
    }
  };

  const visible = limit ? items.slice(0, limit) : items;

  return (
    <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-[#0095D9]" />
          <h2 className="text-base font-semibold text-[#1E3A5F] dark:text-white">
            Announcements
          </h2>
        </div>
        {limit && items.length > limit ? (
          <Link to="/announcements" className="text-sm font-medium text-[#0095D9] hover:underline">
            View all
          </Link>
        ) : null}
      </div>

      {showComposer && canPublish ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void post();
          }}
        >
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={150}
            placeholder="Announcement title"
            className="w-full rounded-xl border border-[#1E3A5F]/20 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Write the announcement"
            className="w-full rounded-xl border border-[#1E3A5F]/20 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          <button
            type="submit"
            disabled={saving || !title.trim() || !body.trim()}
            className="rounded-xl bg-[#1E3A5F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Posting..." : "Post announcement"}
          </button>
        </form>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No announcements yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {visible.map((item) => (
            <li key={item.announcement_id} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">{item.title}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                    {item.body}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {[item.author_name, item.author_role, item.created_at].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {canPublish ? (
                  <button
                    type="button"
                    onClick={() => void remove(item.announcement_id)}
                    className="text-xs font-semibold text-rose-600"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default AnnouncementBoard;
