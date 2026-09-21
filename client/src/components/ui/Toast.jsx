import { createContext, useContext, useEffect, useRef, useState } from "react";
const Context = createContext(null);
export function ToastProvider({ children }) {
  const [message, setMessage] = useState(""),
    timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  const notify = (text) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(""), 5000);
  };
  return (
    <Context.Provider value={notify}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {message && (
          <div className="toast">
            {message}
            <button
              onClick={() => setMessage("")}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </Context.Provider>
  );
}
export const useToast = () => useContext(Context);
