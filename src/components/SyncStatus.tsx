"use client";

export type SyncStatusType =
  | "synced"
  | "not_synced"
  | "warning"
  | "stale"
  | "error"
  | "syncing";

interface SyncStatusProps {
  status: SyncStatusType;
  showText?: boolean;
}

export default function SyncStatus({
  status,
  showText = true,
}: SyncStatusProps) {
  // Determine badge and text based on status
  const getStatusDetails = () => {
    switch (status) {
      case "synced":
        return {
          badgeClass: "badge-success",
          text: "Synced",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="inline-block w-4 h-4 stroke-current"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          ),
        };
      case "error":
        return {
          badgeClass: "badge-error",
          text: "Error",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="inline-block w-4 h-4 stroke-current"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          ),
        };
      case "syncing":
        return {
          badgeClass: "badge-warning",
          text: "Syncing",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="inline-block w-4 h-4 stroke-current animate-spin"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ),
        };
      default:
        return {
          badgeClass: "badge-outline",
          text: "Not Synced",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="inline-block w-4 h-4 stroke-current"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2"></circle>
            </svg>
          ),
        };
    }
  };

  const { badgeClass, text, icon } = getStatusDetails();

  return (
    <div className={`badge ${badgeClass} gap-1`}>
      {icon}
      {showText && <span>{text}</span>}
    </div>
  );
}
