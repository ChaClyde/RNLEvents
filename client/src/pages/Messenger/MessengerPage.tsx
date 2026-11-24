import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { MessageSquare, Send } from "lucide-react";
import { Permission } from "../../permissions";
import { usePermissions } from "../../hooks/usePermissions";
import MessengerService, {
  type MessengerConversation,
  type MessengerMessage,
  type MessengerPerson,
} from "../../services/MessengerService";

const MessengerPage = () => {
  const { can } = usePermissions();
  const [conversations, setConversations] = useState<MessengerConversation[]>([]);
  const [people, setPeople] = useState<MessengerPerson[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [person, setPerson] = useState<MessengerPerson | null>(null);
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [searching, setSearching] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const response = await MessengerService.conversations();
    setConversations(response.data.data);
  }, []);

  const loadMessages = useCallback(async (conversationId: number) => {
    const response = await MessengerService.messages(conversationId);
    setPerson(response.data.data.person);
    setMessages(response.data.data.messages);
  }, []);

  useEffect(() => {
    if (!can(Permission.MESSENGER_VIEW)) {
      return;
    }

    let active = true;

    const refresh = async () => {
      try {
        await loadConversations();
      } catch (err) {
        if (active) {
          setError(
            isAxiosError(err) && err.response?.status === 403
              ? "You do not have permission to use Messenger."
              : "Unable to load conversations.",
          );
        }
      }
    };

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 8000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [can, loadConversations]);

  useEffect(() => {
    if (!can(Permission.MESSENGER_VIEW)) {
      return;
    }

    const term = search.trim();
    if (!term) {
      setPeople([]);
      setSearching(false);
      return;
    }

    let active = true;
    setSearching(true);

    const timer = window.setTimeout(() => {
      void MessengerService.users(term)
        .then((response) => {
          if (active) {
            setPeople(response.data.data);
            setError("");
          }
        })
        .catch(() => {
          if (active) {
            setPeople([]);
            setError("Unable to search people. Please try again.");
          }
        })
        .finally(() => {
          if (active) {
            setSearching(false);
          }
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [can, search]);

  useEffect(() => {
    if (!selectedId || !can(Permission.MESSENGER_VIEW)) {
      return;
    }

    let active = true;
    const refresh = async () => {
      try {
        await loadMessages(selectedId);
        await loadConversations();
      } catch {
        if (active) {
          setError("Unable to load this conversation.");
        }
      }
    };

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [can, loadConversations, loadMessages, selectedId]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages]);

  const openPerson = async (userId: number) => {
    setError("");
    try {
      const response = await MessengerService.open(userId);
      setSelectedId(response.data.data.conversation_id);
      setPerson(response.data.data.person);
      setSearch("");
      setPeople([]);
      await loadConversations();
    } catch {
      setError("That person cannot be messaged right now.");
    }
  };

  const sendMessage = async () => {
    if (!selectedId || !draft.trim() || sending) {
      return;
    }

    setSending(true);
    setError("");
    try {
      const response = await MessengerService.send(selectedId, draft.trim());
      setMessages((current) => [...current, response.data.data]);
      setDraft("");
      await loadConversations();
    } catch {
      setError("The message was not sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!can(Permission.MESSENGER_VIEW)) {
    return (
      <div className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-8">
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Messenger</h1>
        <p className="mt-2 text-sm text-slate-500">Messenger is not available for this role.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0095D9]/10">
          <MessageSquare className="h-6 w-6 text-[#0095D9]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] dark:text-white">Messenger</h1>
          <p className="text-sm text-slate-500">Send a direct message to another FilSched user.</p>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="grid min-h-[34rem] gap-4 lg:grid-cols-[20rem_1fr]">
        <aside className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <label className="block text-sm text-slate-600 dark:text-slate-300">
            Find a person
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, username, or office"
              className="mt-1 w-full rounded-xl border border-[#1E3A5F]/20 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
          {search.trim() && searching ? (
            <p className="mt-3 text-sm text-slate-500">Searching...</p>
          ) : null}
          {search.trim() && !searching && people.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No one matches that name, username, or office.</p>
          ) : null}
          {people.length > 0 ? (
            <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {people.map((item) => (
                <li key={item.user_id}>
                  <button
                    type="button"
                    onClick={() => void openPerson(item.user_id)}
                    className="w-full py-2 text-left"
                  >
                    <p className="font-medium text-slate-800 dark:text-slate-100">{item.full_name}</p>
                    <p className="text-xs text-slate-500">
                      {[item.role, item.office].filter(Boolean).join(" · ") || "FilSched user"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <h2 className="mt-4 text-xs font-semibold uppercase text-slate-500">Conversations</h2>
          {conversations.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No conversations yet. Search for a person to start one.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {conversations.map((item) => (
                <li key={item.conversation_id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.conversation_id)}
                    className={`w-full rounded-xl px-3 py-2 text-left ${
                      selectedId === item.conversation_id
                        ? "bg-[#1E3A5F] text-white"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.person?.full_name ?? "Unknown user"}</span>
                      {item.unread_count > 0 ? (
                        <span className="rounded-full bg-[#0095D9] px-2 text-xs text-white">
                          {item.unread_count}
                        </span>
                      ) : null}
                    </span>
                    <span className={`mt-1 block truncate text-xs ${selectedId === item.conversation_id ? "text-white/80" : "text-slate-500"}`}>
                      {item.last_message ?? "No messages yet"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="flex min-h-[34rem] flex-col rounded-2xl border border-[#1E3A5F]/15 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {selectedId && person ? (
            <>
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-[#1E3A5F] dark:text-white">{person.full_name}</h2>
                <p className="text-xs text-slate-500">
                  {[person.role, person.office].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {messages.length === 0 ? (
                  <p className="text-sm text-slate-500">Start the conversation.</p>
                ) : (
                  messages.map((message) => (
                    <div key={message.message_id} className={`flex ${message.mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                          message.mine
                            ? "bg-[#1E3A5F] text-white"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.body}</p>
                        <p className={`mt-1 text-[11px] ${message.mine ? "text-white/70" : "text-slate-500"}`}>
                          {message.created_at}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form
                className="flex gap-2 border-t border-slate-100 p-4 dark:border-slate-800"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage();
                }}
              >
                <label className="sr-only" htmlFor="messenger-draft">Message</label>
                <input
                  id="messenger-draft"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={2000}
                  placeholder="Write a message"
                  className="flex-1 rounded-xl border border-[#1E3A5F]/20 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0095D9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500">
              Choose a conversation or search for a person to contact.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default MessengerPage;
