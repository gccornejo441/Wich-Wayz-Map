import { useForm } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom";
import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { resetPasswordSchema } from "../../constants/validators";
import { resetPassword } from "../../services/security";

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

const ResetPassword = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [responseType, setResponseType] = useState<"success" | "error" | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: yupResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setResponseType("error");
      setResponseMessage("Invalid or missing reset token.");
      return;
    }

    try {
      const response = await resetPassword(token, data.password);

      if (response.success) {
        setResponseType("success");
        setResponseMessage(response.message);
        setTimeout(() => navigate("/"), 3000);
      } else {
        setResponseType("error");
        setResponseMessage(response.message);
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      setResponseType("error");
      setResponseMessage(
        "An unexpected error occurred. Please try again later.",
      );
    }
  };

  return (
    <div className="flex justify-center items-center bg-background">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-card">
        <h1 className="text-2xl font-semibold text-dark mb-4">
          Reset Password
        </h1>
        {responseType === "success" ? (
          <p className="text-primary text-center">{responseMessage}</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-dark"
              >
                New Password
              </label>
              <input
                type="password"
                id="password"
                {...register("password")}
                className={`w-full mt-1 p-2 border rounded-lg text-dark focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.password ? "border-red-500" : ""
                }`}
              />
              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-dark"
              >
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                {...register("confirmPassword")}
                className={`w-full mt-1 p-2 border rounded-lg text-dark focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.confirmPassword ? "border-red-500" : ""
                }`}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
            {responseType === "error" && responseMessage && (
              <p className="text-sm text-red-500 text-center">
                {responseMessage}
              </p>
            )}
            <button
              type="submit"
              className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
            >
              Reset Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
