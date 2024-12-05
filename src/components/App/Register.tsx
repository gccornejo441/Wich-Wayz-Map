import { useState } from "react";
import { useAuth } from "../../context/authContext";
import { useForm, Controller } from "react-hook-form";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { ROUTES } from "../../constants/routes";

const registerSchema = Yup.object().shape({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .max(4096, "Password must not exceed 4096 characters")
    .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
    .matches(/[a-z]/, "Password must contain at least one lowercase letter")
    .matches(/[0-9]/, "Password must contain at least one numeric character")
    .matches(
      /[!@#$%^&*(),.?":{}|<>]/,
      "Password must contain at least one special character",
    )
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password"), undefined], "Passwords do not match")
    .required("Please confirm your password"),
});

const Register = () => {
  const { register: registerUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(registerSchema),
  });

  const onSubmit = async (data: { email: string; password: string }) => {
    setError(null);
    setMessage(null);

    const response = await registerUser(data.email, data.password);
    if (!response.success) {
      setError(response.message);
    } else {
      setMessage("Registration successful! Please log in.");
    }
  };

  return (
    <div className="bg-lightGray font-sans min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-8 bg-background rounded-xl shadow-card">
        <h2 className="text-accent text-2xl font-poppins font-bold text-center mb-4">
          Register
        </h2>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-dark text-sm mb-2">Email</label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
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
            <label className="block text-dark text-sm mb-2">Password</label>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
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
            <label className="block text-dark text-sm mb-2">
              Confirm Password
            </label>
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="password"
                  className="w-full border border-lightGray px-4 py-3 rounded-md text-dark focus:outline-none focus:ring focus:ring-secondary"
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
          {message && <p className="text-secondary text-sm">{message}</p>}

          <button
            type="submit"
            className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 focus:outline-none"
          >
            Register
          </button>
        </form>
        <p className="text-dark text-sm text-center mt-4">
          Already have an account?{" "}
          <a
            href={ROUTES.ACCOUNT.SIGN_IN}
            className="text-primary font-semibold hover:underline"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;
