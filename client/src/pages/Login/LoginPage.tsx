import { useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import {
  FiArrowRight,
  FiArrowUpRight,
  FiCalendar,
  FiCheckSquare,
  FiLogIn,
  FiMapPin,
} from "react-icons/fi";

import { useAuth } from "../../contexts/AuthContext";
import FloatingLabelInput from "../../components/Input/FloatingLabelInput";

// Same logo file as the header: client/src/assets/fs.png
import logo from "../../assets/fs.png";

// Optional campus photo shown softly behind the page.
// Put an image in client/public (e.g. campus.jpg) and set it here: "/campus.jpg"
const BACKGROUND_IMAGE = "";

// Sample cards for the "Booked Events" list. Replace with real data
// (it needs a public endpoint, since nobody is signed in on this page)
// or delete the array to hide the list.
const FEATURED_BOOKINGS = [
  { id: 1, venue: "ROBLEE HALL", pic: "Ms. Cha Naydo" },
  { id: 2, venue: "ROBLEE HALL", pic: "Ms. Cha Naydo" },
];

const STEPS = [
  { label: "Sign In", icon: FiLogIn },
  { label: "Book", icon: FiCalendar },
  { label: "Get Approved", icon: FiCheckSquare },
];

const LoginPage = () => {
  const { login } = useAuth();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login({ login: loginValue.trim(), password });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 422) {
        setError(
          err.response.data?.errors?.login?.[0] ??
            err.response.data?.message ??
            "Invalid credentials.",
        );
      } else if (isAxiosError(err) && err.response?.status === 403) {
        setError(
          err.response.data?.message ??
            "This account is inactive. Contact an administrator.",
        );
      } else {
        setError("Unable to sign in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-linear-to-br from-[#EAF2FB] via-[#DCE9F7] to-[#F4F8FD]">
      {/* Background: optional photo + soft light-blue wash */}
      {BACKGROUND_IMAGE && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-40 blur-[2px]"
          style={{ backgroundImage: `url(${BACKGROUND_IMAGE})` }}
        />
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-[#2F63D4]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-[#FFB800]/10 blur-3xl"
      />

      {/* HEADER */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-6 sm:px-12">
        <div className="flex flex-1 items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 items-center rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-[#E5E8EF]">
              <img
                src={logo}
                alt="FilSched logo"
                className="h-full w-auto select-none object-contain"
                draggable={false}
              />
            </span>
            <span className="text-xl font-extrabold uppercase tracking-wide text-[#0B5FA5]">
              FilSched
            </span>
          </div>

          <span
            aria-hidden
            className="hidden h-px w-[min(32rem,45%)] bg-linear-to-r from-[#2F63D4]/60 to-transparent sm:block"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowHelp((value) => !value)}
            aria-label="Help"
            aria-expanded={showHelp}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7FA7DB] text-lg font-bold text-white ring-4 ring-white/60 transition hover:bg-[#2F63D4]"
          >
            ?
          </button>

          {showHelp && (
            <div className="absolute right-0 top-12 z-20 w-64 rounded-xl border border-[#E5E8EF] bg-white p-4 text-sm text-[#5B6678] shadow-lg">
              <p className="font-semibold text-[#002583]">Need help?</p>
              <p className="mt-1">
                Use the email or username given to you by the university. If you
                can't sign in, contact your system administrator.
              </p>
            </div>
          )}
        </div>
      </header>

      {/* MAIN */}
      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 py-10 sm:px-12 lg:grid-cols-[1.1fr_1fr]">
        {/* Left: headline + booked events */}
        <section>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            <span className="block text-[#002583]">WELCOME TO THE</span>
            <span className="block bg-linear-to-r from-[#0B5FA5] to-[#2F9BD9] bg-clip-text text-transparent">
              FILSCHED PORTAL
            </span>
          </h1>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-[#4A5A70]">
            Reserve campus venues and vehicles in one place. Submit a request,
            follow its approval, and see what is already scheduled.
          </p>

          {FEATURED_BOOKINGS.length > 0 && (
            <div className="mt-8 hidden max-w-md sm:block">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#5B6678]">
                Booked events
              </p>

              <ul className="space-y-3">
                {FEATURED_BOOKINGS.map((booking) => (
                  <li
                    key={booking.id}
                    className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-md ring-1 ring-[#E5E8EF]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E3EBFF] text-[#1F4FC0]">
                      <FiMapPin size={20} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold text-[#002583]">
                        {booking.venue}
                      </p>
                      <p className="text-xs text-[#5B6678]">
                        PIC: {booking.pic}
                      </p>
                    </div>

                    <FiArrowUpRight
                      className="shrink-0 text-[#2F63D4]"
                      size={20}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Right: sign-in card */}
        <section className="w-full max-w-md justify-self-center rounded-3xl bg-white p-8 shadow-xl ring-1 ring-[#E5E8EF] lg:justify-self-end">
          <div className="text-center">
            <h2 className="text-sm font-bold text-[#002583]">
              Welcome to FilSched
            </h2>
            <p className="mt-1 text-xs text-[#5B6678]">
              Vehicle &amp; Venue Scheduling System
            </p>
          </div>

          <hr className="my-5 border-[#E5E8EF]" />

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <FloatingLabelInput
              name="login"
              label="Email or username"
              type="text"
              value={loginValue}
              onChange={(event) => setLoginValue(event.target.value)}
              required
            />

            <FloatingLabelInput
              name="password"
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-between rounded-2xl bg-linear-to-r from-[#1B3A73] via-[#1D4590] to-[#0B2A5B] px-6 py-4 text-sm font-bold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="flex items-center gap-3">
                <FiLogIn size={18} />
                {submitting ? "Signing in..." : "Sign in to FilSched"}
              </span>
              <FiArrowRight size={20} />
            </button>

            <p className="px-2 text-center text-[11px] leading-snug text-[#5B6678]">
              Access FilSched using the account credentials provided by the
              university.
            </p>
          </form>

          <hr className="my-5 border-[#E5E8EF]" />

          <div>
            <p className="text-xs font-bold text-[#002583]">How it works?</p>

            <ol className="mt-3 flex items-center justify-between">
              {STEPS.map((step, index) => (
                <li key={step.label} className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E3EBFF] text-[#002583]">
                      <step.icon size={18} />
                    </span>
                    <span className="text-[11px] font-semibold text-[#002583]">
                      {step.label}
                    </span>
                  </div>

                  {index < STEPS.length - 1 && (
                    <FiArrowRight
                      className="mb-4 shrink-0 text-[#9AA9C2]"
                      size={16}
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-[#2F63D4]/15 px-6 py-5 text-center text-xs text-[#4A5A70]">
        <p>
          <span className="font-bold text-[#002583]">
            Filamer Christian University, Inc.
          </span>{" "}
          Roxas City, Roxas Capiz, 5800 Philippines
        </p>
        <p className="mt-1">
          © {new Date().getFullYear()} Filamer Christian University, Inc. All
          rights reserved
        </p>
      </footer>
    </div>
  );
};

export default LoginPage;
