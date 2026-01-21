import { useState } from "react";
import { useAuth } from "@/context/authContext";
import { useModal } from "@/context/modalContext";
import { useToast } from "@/context/toastContext";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { registerSchema } from "@/constants/validators";
import GoogleButton from "../Utilites/GoogleButton";
import Logo from "../Logo/Logo";
import { HiEye, HiEyeOff, HiX } from "react-icons/hi";
import { Checkbox, Label } from "flowbite-react";
import { useNavigate } from "react-router-dom";

const AuthModal = () => {
  const { currentModal, loginMode, closeModal, switchToLogin, switchToSignup } =
    useModal();
  const {
    login,
    register: registerUser,
    resetPassword,
    signInWithGoogle,
  } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Shared state
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sign In specific state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Register form
  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(registerSchema),
  });

  const isOpen = currentModal === "login" || currentModal === "signup";

  const handleClose = () => {
    closeModal();
    setError(null);
    setMessage(null);
    setEmail("");
    setPassword("");
    setRememberMe(false);
    setPasswordVisible(false);
    reset();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    setError(null);
    setMessage(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await login(email, password, rememberMe);
      if (!response.success) {
        setError(response.message);
      } else {
        addToast("Signed in successfully!", "success");
        handleClose();
        navigate("/");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: { email: string; password: string }) => {
    setError(null);
    setMessage(null);

    const response = await registerUser(data.email, data.password);
    if (!response.success) {
      setError(response.message);
    } else {
      setMessage(
        "Registration successful! Please check your email to verify your account.",
      );
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    setMessage(null);

    const response = await resetPassword(email);
    if (!response.success) {
      setError(response.message);
    } else {
      setMessage("Password reset email sent successfully!");
    }
  };

  const handleGoogleAuth = async () => {
    if (isLoading) return;

    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const response = await signInWithGoogle();
      if (!response.success) {
        setError(response.message);
      } else {
        addToast("Signed in successfully!", "success");
        handleClose();
        navigate("/");
      }
    } catch (error) {
      console.error("Google auth error:", error);
      if (error instanceof Error) {
        if (error.message.includes("auth/cancelled-popup-request")) {
          setError("Another sign-in request is in progress. Please wait.");
        } else if (error.message.includes("auth/popup-closed-by-user")) {
          setError("Google sign-in popup was closed. Please try again.");
        } else {
          setError("An unexpected error occurred.");
        }
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative bg-white dark:bg-surface-darker rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto pointer-events-auto animate-modalEnter"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-text-muted hover:text-text-base dark:text-text-inverted dark:hover:text-white transition-colors z-10"
            aria-label="Close modal"
          >
            <HiX size={24} />
          </button>

          <div className="p-6">
            <Logo
              imageSource="/Wich-Wayz-Logo.svg"
              className="h-15 w-60 mx-auto mb-4"
            />

            <h2 className="text-text-base dark:text-white text-center text-2xl font-poppins font-bold mb-6">
              {loginMode ? "Sign in" : "Register"}
            </h2>

            {loginMode ? (
              // SIGN IN FORM
              <form className="space-y-4" onSubmit={handleLogin}>
                <div>
                  <label className="text-dark dark:text-white text-sm mb-2 block">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-dark dark:text-white text-sm border-2 border-brand-primary dark:border-gray-600 px-4 py-3 bg-white dark:bg-surface-dark focus:border-brand-primary rounded-md focus:outline-none focus:ring focus:ring-brand-primary"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label className="text-dark dark:text-white text-sm mb-2 block">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={passwordVisible ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-dark dark:text-white text-sm border-2 border-brand-primary dark:border-gray-600 px-4 py-3 bg-white dark:bg-surface-dark focus:border-brand-primary rounded-md focus:outline-none focus:ring focus:ring-brand-primary"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="absolute right-4 text-brand-primary dark:text-text-muted focus:outline-none"
                      onClick={() => setPasswordVisible(!passwordVisible)}
                    >
                      {passwordVisible ? <HiEyeOff /> : <HiEye />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-brand-primary dark:text-brand-secondary text-sm">
                    {error}
                  </p>
                )}
                {message && (
                  <p className="text-green-600 dark:text-green-400 text-sm">
                    {message}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember-me"
                      name="remember-me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="accent-brand-primary dark:border-text-muted dark:bg-transparent checked:text-brand-primary checked:bg-brand-primary focus:ring-brand-primary"
                    />
                    <Label
                      htmlFor="remember-me"
                      className="text-sm text-text-base dark:text-white"
                    >
                      Remember me
                    </Label>
                  </div>
                  <div className="text-sm">
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      className="text-text-base dark:text-white hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 text-sm tracking-wide rounded-lg bg-brand-primary text-text-inverted hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors duration-150"
                >
                  Sign in
                </button>

                <GoogleButton
                  disabled={isLoading}
                  handleClick={handleGoogleAuth}
                  title="Sign in with Google"
                />

                <p className="text-text-base dark:text-white text-sm text-center">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMessage(null);
                      switchToSignup();
                    }}
                    className="text-brand-primary dark:text-brand-secondary hover:underline font-semibold"
                  >
                    Register here
                  </button>
                </p>
              </form>
            ) : (
              // REGISTER FORM
              <form
                className="space-y-4"
                onSubmit={handleSubmit(handleRegister)}
              >
                <div>
                  <label className="block text-dark dark:text-white text-sm mb-2">
                    Email
                  </label>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="email"
                        className="w-full border border-lightGray dark:border-gray-600 px-4 py-3 rounded-md text-dark dark:text-white bg-white dark:bg-surface-dark focus:outline-none focus:ring focus:ring-brand-secondary"
                        placeholder="Enter your email"
                      />
                    )}
                  />
                  {errors.email && (
                    <p className="text-brand-primary dark:text-brand-secondary text-sm mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-dark dark:text-white text-sm mb-2">
                    Password
                  </label>
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="password"
                        className="w-full border border-lightGray dark:border-gray-600 px-4 py-3 rounded-md text-dark dark:text-white bg-white dark:bg-surface-dark focus:outline-none focus:ring focus:ring-brand-secondary"
                        placeholder="Enter your password"
                      />
                    )}
                  />
                  {errors.password && (
                    <p className="text-brand-primary dark:text-brand-secondary text-sm mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-dark dark:text-white text-sm mb-2">
                    Confirm Password
                  </label>
                  <Controller
                    name="confirmPassword"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="password"
                        className="w-full border border-gray-200 dark:border-gray-600 px-4 py-3 rounded-md text-dark dark:text-white bg-white dark:bg-surface-dark focus:outline-none focus:ring focus:ring-brand-secondary"
                        placeholder="Confirm your password"
                      />
                    )}
                  />
                  {errors.confirmPassword && (
                    <p className="text-brand-primary dark:text-brand-secondary text-sm mt-1">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {error && (
                  <p className="text-brand-primary dark:text-brand-secondary text-sm">
                    {error}
                  </p>
                )}
                {message && (
                  <p className="text-green-600 dark:text-green-400 text-sm">
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 focus:outline-none"
                >
                  Register
                </button>

                <GoogleButton
                  disabled={isLoading}
                  title="Sign up with Google"
                  handleClick={handleGoogleAuth}
                />

                <p className="text-dark dark:text-white text-sm text-center">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMessage(null);
                      switchToLogin();
                    }}
                    className="text-brand-primary dark:text-brand-secondary font-semibold hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthModal;
