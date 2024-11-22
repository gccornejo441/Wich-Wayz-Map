import ToastMessage from "../Toast/ToastMessage";

interface ModalWrapperProps {
  children: React.ReactNode;
  toastMessage?: string | null;
  toastType?: "success" | "error";
}

const ModalWrapper = ({
  children,
  toastMessage,
  toastType = "success",
}: ModalWrapperProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="relative p-1 w-full max-w-md max-h-full bg-background rounded-lg shadow-card">
        {children}
      </div>
      {toastMessage && (
        <ToastMessage toastMessage={toastMessage} toastType={toastType} />
      )}
    </div>
  );
};

export default ModalWrapper;
