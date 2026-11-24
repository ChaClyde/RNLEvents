import AnnouncementBoard from "./AnnouncementBoard";

const AnnouncementsPage = () => {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-[#1E3A5F] dark:text-white">
          Announcements
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Notices posted by the Super Admin, Event Admin, and Vehicle Admin appear here and on every dashboard.
        </p>
      </header>
      <AnnouncementBoard showComposer />
    </div>
  );
};

export default AnnouncementsPage;
