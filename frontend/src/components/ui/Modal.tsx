interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  headerAction?: React.ReactNode;
  zIndex?: number;
  children: React.ReactNode;
}

function Modal({
  isOpen,
  onClose,
  title,
  headerAction,
  zIndex = 50,
  children,
}: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex }}>
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Contenido */}
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="truncate text-xl font-semibold">{title}</h2>
            {headerAction}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

export default Modal;