import {
  createContext,
  useCallback,
  useContext,
  useState,
  type FC,
  type ReactNode,
} from "react";
import ToastMessage from "../components/ToastMessage/ToastMessage";

interface ToastContextValue {
  showToast: (message: string, isFailed?: boolean) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState("");
  const [isFailed, setIsFailed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const showToast = useCallback((msg: string, failed = false) => {
    setMessage(msg);
    setIsFailed(failed);
    setIsVisible(true);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastMessage
        message={message}
        isFailed={isFailed}
        isVisible={isVisible}
        onClose={() => setIsVisible(false)}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
};
