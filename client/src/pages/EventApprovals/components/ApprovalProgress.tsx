import { FiCheck, FiX } from "react-icons/fi";
import type {
  ApprovalStageKey,
  EventBooking,
} from "../../../interfaces/EventBookingFlow";

export const EVENT_STAGES: { key: ApprovalStageKey; label: string }[] = [
  { key: "office_head", label: "Office Head / Dean" },
  { key: "event_admin", label: "Event Admin" },
  { key: "event_approval", label: "Admin Approvals" },
  { key: "super_admin", label: "Super Admin" },
];

type StepState = "approved" | "rejected" | "current" | "upcoming";

function rowsFor(booking: EventBooking, stage: ApprovalStageKey) {
  return booking.approvals?.filter((row) => row.approval_stage === stage) ?? [];
}

function stateFor(booking: EventBooking, stage: ApprovalStageKey): StepState {
  const rows = rowsFor(booking, stage);

  if (stage === "event_approval") {
    const legacy = rows.find((row) => !row.decision_slot);
    if (legacy) {
      return legacy.action === "approved" ? "approved" : "rejected";
    }

    const businessManager = rows.find(
      (row) => row.decision_slot === "business_manager",
    );
    const vpFinance = rows.find((row) => row.decision_slot === "vp_finance");

    if (
      businessManager?.action === "rejected" ||
      vpFinance?.action === "rejected"
    ) {
      return "rejected";
    }
    if (
      businessManager?.action === "approved" &&
      vpFinance?.action === "approved"
    ) {
      return "approved";
    }
    if (booking.status === "pending" && booking.approval_stage === stage) {
      return "current";
    }
    return "upcoming";
  }

  const decision = rows[0];

  if (decision) {
    return decision.action === "approved" ? "approved" : "rejected";
  }
  if (booking.status === "pending" && booking.approval_stage === stage) {
    return "current";
  }
  return "upcoming";
}

function approverLine(booking: EventBooking, stage: ApprovalStageKey): string {
  const rows = rowsFor(booking, stage);

  if (
    stage !== "event_approval" ||
    rows.length === 0 ||
    rows.some((row) => !row.decision_slot)
  ) {
    return rows[0]?.approver?.full_name ?? "";
  }

  const businessManager = rows.find(
    (row) => row.decision_slot === "business_manager",
  );
  const vpFinance = rows.find((row) => row.decision_slot === "vp_finance");

  return [
    businessManager?.approver?.full_name
      ? `BM: ${businessManager.approver.full_name}`
      : "BM: waiting",
    vpFinance?.approver?.full_name
      ? `VP: ${vpFinance.approver.full_name}`
      : "VP: waiting",
  ].join(" · ");
}

const circle: Record<StepState, string> = {
  approved: "bg-primary text-white border-primary",
  rejected: "bg-danger text-white border-danger",
  current: "bg-accent text-on-accent border-accent",
  upcoming: "bg-surface text-muted border-line",
};

export default function ApprovalProgress({
  booking,
}: {
  booking: EventBooking;
}) {
  return (
    <ol className="flex w-full items-start">
      {EVENT_STAGES.map((stage, index) => {
        const state = stateFor(booking, stage.key);
        const decision = booking.approvals?.find(
          (a) => a.approval_stage === stage.key,
        );
        const names = approverLine(booking, stage.key);

        return (
          <li key={stage.key} className="relative flex-1 text-center">
            {index > 0 && (
              <span
                className={`absolute left-0 top-3.5 h-0.5 w-1/2 ${
                  state === "upcoming" ? "bg-line" : "bg-primary"
                }`}
              />
            )}
            {index < EVENT_STAGES.length - 1 && (
              <span
                className={`absolute right-0 top-3.5 h-0.5 w-1/2 ${
                  state === "approved" ? "bg-primary" : "bg-line"
                }`}
              />
            )}

            <span
              className={`relative z-10 mx-auto flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${circle[state]}`}
            >
              {state === "approved" ? (
                <FiCheck />
              ) : state === "rejected" ? (
                <FiX />
              ) : (
                index + 1
              )}
            </span>

            <p className="mt-2 px-1 text-xs font-medium text-ink">
              {stage.label}
            </p>
            <p className="px-1 text-[11px] text-muted">
              {state === "current" && "Waiting"}
              {state === "upcoming" && "Not yet"}
              {names || decision?.approver?.full_name}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
