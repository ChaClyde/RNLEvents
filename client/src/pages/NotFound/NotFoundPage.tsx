import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-[#1E3A5F]/15 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-[#1E3A5F]">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        The page you requested does not exist.
      </p>
      <Link
        to="/"
        className="mt-5 inline-flex rounded-xl bg-[#1E3A5F] px-4 py-2 text-sm font-medium text-white hover:bg-[#0F766E]"
      >
        Back to Dashboard
      </Link>
    </div>
  );
};

export default NotFoundPage;
