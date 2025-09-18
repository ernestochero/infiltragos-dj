import { Dialog } from "@headlessui/react";
import { useEffect, useState } from "react";

interface FirstVisitModalProps {
  storageKey?: string;
  title?: string;
  description?: string;
  buttonText?: string;
}

export default function FirstVisitModal({
  storageKey = "welcomeSession",
  title = "Bienvenido",
  description = "Gracias por visitarnos",
  buttonText = "Cerrar",
}: FirstVisitModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const alreadyVisited = sessionStorage.getItem(storageKey);
      if (!alreadyVisited) {
        setIsOpen(true);
      }
    }
  }, [storageKey]);

  function handleClose() {
    setIsOpen(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(storageKey, "true");
    }
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
        <div className="bg-white p-6 m-3 rounded-2xl shadow-xl max-w-md w-full">
          <h2 className="text-3xl font-bold text-center text-indigo-600">
            {title}
          </h2>
          <p className="mt-3 text-xl text-gray-800 text-center whitespace-pre-line">
            {description}
          </p>
          <div className="mt-6 flex justify-center">
            <button
              className="text-xl px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
              onClick={() => setIsOpen(false)}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
