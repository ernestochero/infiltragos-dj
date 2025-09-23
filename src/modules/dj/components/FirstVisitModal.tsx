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
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
        <div className="bg-card-bg p-8 m-3 rounded-2xl shadow-2xl max-w-sm w-full">
          <h2 className="text-2xl font-bold text-center text-white">{title}</h2>
          <p className="mt-3 text-sm text-gray-400 text-center whitespace-pre-line">
            {description}
          </p>
          <div className="mt-6 flex justify-center">
            <button
              className="text-sm px-6 py-3 rounded-full bg-accent text-dark-bg font-bold hover:bg-accent-hover transition-colors"
              onClick={handleClose}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
