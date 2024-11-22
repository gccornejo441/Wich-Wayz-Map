import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { HiOutlineRefresh } from "react-icons/hi";
import ModalWrapper from "./ModalWrapper";
import { useAuth } from "../../context/authContext";
import { userLoginSchema } from "../../services/validators";

interface LoginModalProps {
  onClose: () => void;
  onSwitchToSignup: () => void;
}

interface FormInputs {
  email: string;
  password: string;
}

const LoginModal = ({ onClose }: LoginModalProps) => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormInputs>({
    resolver: yupResolver(userLoginSchema),
  });

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    setIsLoading(true);
    try {
      const { email, password } = data;
      const { success, message } = await login(email, password);
      setToastMessage(message);
      setToastType(success ? "success" : "error");

      if (success) {
        reset();
        onClose();
      }
    } catch (error) {
      console.error("Login failed:", error);
      setToastMessage("An unexpected error occurred.");
      setToastType("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalWrapper toastMessage={toastMessage} toastType={toastType}>
      <div className="flex items-center justify-between p-4 border-b border-secondary">
        <h3 className="text-lg font-semibold text-dark">Login</h3>
        <button
          onClick={onClose}
          className="text-dark hover:bg-accent/10 rounded-lg text-sm w-8 h-8 flex items-center justify-center"
        >
          ✕
        </button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
        <input
          type="email"
          disabled={isLoading}
          placeholder="Email"
          {...register("email")}
          className={`w-full p-2 border rounded-lg bg-white text-dark ${errors.email ? "border-red-500" : ""}`}
        />
        {errors.email && (
          <p className="text-red-500 text-sm">{errors.email.message}</p>
        )}
        <input
          type="password"
          placeholder="Password"
          disabled={isLoading}
          {...register("password")}
          className={`w-full p-2 border rounded-lg bg-white text-dark ${errors.password ? "border-red-500" : ""}`}
        />
        {errors.password && (
          <p className="text-red-500 text-sm">{errors.password.message}</p>
        )}
        <button
          type="submit"
          className={`w-full px-4 py-2 rounded-lg text-white transition-colors ${
            isLoading
              ? "bg-secondary cursor-not-allowed"
              : "bg-primary hover:bg-secondary"
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <HiOutlineRefresh className="w-5 h-5 animate-spin mr-2" />
              Loading...
            </div>
          ) : (
            "Login"
          )}
        </button>
      </form>
      {/* <div className="text-center mt-4">
        <button
          onClick={onForgotPassword}
          className="text-primary hover:underline"
        >
          Forgot Password?
        </button>
      </div> */}
    </ModalWrapper>
  );
};

export default LoginModal;
