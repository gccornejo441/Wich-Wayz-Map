import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@context/authContext";
import { useModal } from "@context/modalContext";
import { ROUTES } from "@constants/routes";
import { registerSchema } from "@constants/validators";
import GoogleButton from "@components/Utilites/GoogleButton";
import Logo from "@components/Logo/Logo";

const Register = () => {
  const { register: registerUser } = useAuth();
  const { openEmailVerificationModal } = useModal();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: { email: string; password: string }) => {
    setError(null);

    const response = await registerUser(data.email, data.password);
    if (!response.success) {
      setError(response.message);
    } else {
      openEmailVerificationModal(data.email);
    }
  };

  const handleGoogleRegister = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      const response = await registerUser(null, null, true);
      if (!response.success) {
        setError(response.message);
        setIsGoogleLoading(false);
      } else {
        // Success - redirect to home page
        // The authContext will handle metadata loading with retry logic
        navigate(ROUTES.HOME);
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError("An unexpected error occurred.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="bg-lightGray font-sans min-h-[100dvh] flex items-center justify-center px-4">
      <div className="max-w-md w-full p-8 bg-background rounded-xl shadow-card">
        <Link to="/" className="block">
          <Logo
            imageSource="/Wich-Wayz-Logo.svg"
            className="h-15 w-60 mx-auto"
          />
        </Link>
        <h2 className="text-accent text-2xl font-poppins font-bold text-center mb-4">
          Register
        </h2>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="email" className="block text-dark text-sm mb-2">
              Email
            </label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="email"
                  type="email"
                  className="w-full border border-lightGray px-4 py-3 rounded-md text-dark focus:outline-none focus:ring focus:ring-secondary"
                  placeholder="Enter your email"
                />
              )}
            />
            {errors.email && (
              <p className="text-primary text-sm">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-dark text-sm mb-2">
              Password
            </label>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="password"
                  type="password"
                  className="w-full border border-lightGray px-4 py-3 rounded-md text-dark focus:outline-none focus:ring focus:ring-secondary"
                  placeholder="Enter your password"
                />
              )}
            />
            {errors.password && (
              <p className="text-primary text-sm">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-dark text-sm mb-2"
            >
              Confirm Password
            </label>
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="confirmPassword"
                  type="password"
                  className="w-full border border-gray-200 px-4 py-3 rounded-md text-dark focus:outline-none focus:ring focus:ring-secondary"
                  placeholder="Confirm your password"
                />
              )}
            />
            {errors.confirmPassword && (
              <p className="text-primary text-sm">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {error && <p className="text-primary text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 focus:outline-none"
          >
            Register
          </button>
        </form>
        <div className="mt-4">
          <GoogleButton
            title={
              isGoogleLoading
                ? "Signing in with Google..."
                : "Sign up with Google"
            }
            handleClick={handleGoogleRegister}
            disabled={isGoogleLoading}
          />
        </div>

        <p className="text-dark text-sm text-center mt-4">
          Already have an account?{" "}
          <Link
            to={ROUTES.ACCOUNT.SIGN_IN}
            className="text-primary font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
