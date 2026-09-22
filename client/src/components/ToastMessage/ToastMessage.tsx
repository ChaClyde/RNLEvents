// import { useEffect, type FC } from "react";

// interface ToastMessageProps {
//   message: string;
//   isFailed?: boolean;
//   isVisible: boolean;
//   onClose: () => void;
// }

// const ToastMessage: FC<ToastMessageProps> = ({
//   message,
//   isFailed,
//   isVisible,
//   onClose,
// }) => {
//   useEffect(() => {
//     if (isVisible) {
//       const timer = setTimeout(() => {
//         onClose();
//       }, 3000);

//       return () => clearTimeout(timer);
//     }
//   }, [isVisible, onClose]);

//   return (
//     <>
//       <div
//         className={`fixed top-40 right-0 md:right-4 z-999999 flex items-center w-full max-w-xs p-4 mb-4 text-black
//                 ${
//                   isFailed ? "bg-red-100" : "bg-green-100"
//                 }  rounded-lg transition-opacity duration-300
//                 ${isVisible ? "opacity-100" : "opacity-0"}`}
//         role="alert"
//       >
//         <div
//           className={`inline-flex items-center justify-center shrink-0-w-8 h-8
//                 ${
//                   isFailed
//                     ? "text-red-500 bg-red-200"
//                     : "text-green-500 bg-green-200"
//                 }  rounded-g transition-transform
//                 ${isVisible ? "translate-y-0" : "-translate-y-10"}`}
//         >
//           {isFailed ? (
//             <>
//               <svg
//                 className="w-5 h-5"
//                 aria-hidden="true"
//                 xmlns="http://www.w3.org/2000/svg"
//                 width="24"
//                 height="24"
//                 fill="none"
//                 viewBox="0 0 24 24"
//               >
//                 <path
//                   stroke="currentColor"
//                   stroke-linecap="round"
//                   stroke-linejoin="round"
//                   stroke-width="2"
//                   d="M6 18 17.94 6M18 18 6.06 6"
//                 />
//               </svg>
//               <span className="sr-only">Error icon</span>
//             </>
//           ) : (
//             <>
//               <svg
//                 className="w-5 h-5"
//                 aria-hidden="true"
//                 xmlns="http://www.w3.org/2000/svg"
//                 fill="currentColor"
//                 viewBox="0 0 20 20"
//               >
//                 <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z" />
//               </svg>
//               <span className="sr-only">Check icon</span>
//             </>
//           )}
//         </div>
//         <div className="ms-3 text-sm font-normal">{message}</div>
//       </div>
//     </>
//   );
// };

// export default ToastMessage;
import { useEffect, type FC } from "react";

interface ToastMessageProps {
  message: string;
  isFailed?: boolean;
  isVisible: boolean;
  onClose: () => void;
}

const ToastMessage: FC<ToastMessageProps> = ({
  message,
  isFailed = false,
  isVisible,
  onClose,
}) => {
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(onClose, 3000);

    return () => clearTimeout(timer);
  }, [isVisible, onClose]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        fixed top-6 right-4 z-[999999]
        w-[calc(100%-2rem)] max-w-sm
        transform overflow-hidden
        rounded-2xl border
        bg-white shadow-xl shadow-black/10
        transition-all duration-300 ease-out
        ${
          isVisible
            ? "translate-y-0 opacity-100"
            : "-translate-y-4 opacity-0 pointer-events-none"
        }
        ${isFailed ? "border-red-100" : "border-emerald-100"}
      `}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div
          className={`
            flex h-10 w-10 shrink-0 items-center justify-center
            rounded-xl
            ${
              isFailed
                ? "bg-red-50 text-red-500"
                : "bg-emerald-50 text-emerald-500"
            }
          `}
        >
          {isFailed ? (
            <svg
              className="h-5 w-5"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="M6 18 18 6M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="m5 12 4 4L19 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 pt-0.5">
          <p
            className={`text-sm font-semibold ${
              isFailed ? "text-red-900" : "text-emerald-900"
            }`}
          >
            {isFailed ? "Something went wrong" : "Success"}
          </p>

          <p className="mt-1 text-sm leading-5 text-gray-600">{message}</p>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          className="
            shrink-0 rounded-lg p-1.5
            text-gray-400
            transition-colors
            hover:bg-gray-100 hover:text-gray-600
            focus:outline-none focus:ring-2 focus:ring-gray-200
          "
        >
          <svg
            className="h-4 w-4"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M6 18 18 6M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div
        className={`h-1 w-full ${isFailed ? "bg-red-100" : "bg-emerald-100"}`}
      >
        <div
          className={`
            h-full
            animate-[toast-progress_3s_linear_forwards]
            ${isFailed ? "bg-red-500" : "bg-emerald-500"}
          `}
        />
      </div>
    </div>
  );
};

export default ToastMessage;
