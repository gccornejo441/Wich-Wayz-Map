import * as yup from "yup";

/**
 * Validation schema for user credentials.
 * Ensures email is valid and password meets complexity requirements.
 */
export const userCredentialSchema = yup.object().shape({
  email: yup
    .string()
    .email("Please enter a valid email address")
    .required("Email is required"),
  password: yup
    .string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters")
    .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
    .matches(/[a-z]/, "Password must contain at least one lowercase letter")
    .matches(/\d/, "Password must contain at least one number")
    .matches(
      /[!@#$%^&*()_+\-=[\]{}|;:'",.<>?/]/,
      "Password must contain at least one special character",
    ),
});

/**
 * Validation schema for password reset requests.
 * Ensures email is valid.
 */
export const requestPasswordResetSchema = yup.object().shape({
  email: yup
    .string()
    .email("Please enter a valid email address")
    .required("Email is required"),
});

export const resetPasswordSchema = yup.object().shape({
  password: yup
    .string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters")
    .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
    .matches(/[a-z]/, "Password must contain at least one lowercase letter")
    .matches(/\d/, "Password must contain at least one number")
    .matches(
      /[!@#$%^&*()_+\-=[\]{}|;:'",.<>?/]/,
      "Password must contain at least one special character",
    ),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), undefined], "Passwords must match")
    .required("Please confirm your password"),
});

/**
 * Validation schema for location data.
 * Ensures all required fields are present and in the correct format.
 */
export const locationSchema = yup.object().shape({
  shopName: yup.string().required("Shop name is required"),
  website_url: yup.string().url("Invalid URL format").optional(),
  phone: yup.string().optional(),
  address: yup.string().optional(),
  address_first: yup.string().optional(),
  address_second: yup.string().optional(),
  house_number: yup.string().optional(),
  city: yup.string().optional(),
  state: yup.string().optional(),
  postcode: yup.string().required("Zip code is required"),
  country: yup.string().optional(),
  latitude: yup
    .number()
    .required("Latitude is required")
    .typeError("Latitude must be a valid number"),
  longitude: yup
    .number()
    .required("Longitude is required")
    .typeError("Longitude must be a valid number"),
  shop_description: yup
    .string()
    .required("Shop description is required")
    .min(20, "Shop description must be at least 20 characters")
    .max(250, "Shop description must be at most 250 characters"),
  categoryIds: yup
    .array()
    .of(
      yup
        .number()
        .typeError("Each category must be a number")
        .required("Each category must be a valid ID"),
    )
    .default([]),
});

export const userLoginSchema = yup.object().shape({
  email: yup
    .string()
    .email("Invalid email address")
    .required("Email is required"),
  password: yup.string().required("Password is required"),
});

/**
 * Validation schema for updating location data.
 * Ensures all fields are in the correct format.
 */
export const updateShopSchema = yup.object().shape({
  name: yup.string().required("Shop name is required"),
  address: yup.string().optional(),
  shop_description: yup
    .string()
    .optional()
    .min(20, "Shop description must be at least 20 characters")
    .max(250, "Shop description must be at most 250 characters"),
  categoryIds: yup
    .array()
    .of(
      yup
        .number()
        .typeError("Each category must be a number")
        .required("Each category must be a valid ID"),
    )
    .optional(),
});

export const userProfileSchema = yup.object({
  firstName: yup.string().nullable().max(50, "First name is too long"),
  lastName: yup.string().nullable().max(50, "Last name is too long"),
  username: yup.string().nullable().max(30, "Username is too long"),
  avatar: yup.string().nullable(),
});

/**
 * Validation schema for user registration.
 * Ensures all required fields are present and in the correct format.
 */
export const registerSchema = yup.object().shape({
  email: yup
    .string()
    .email("Invalid email address")
    .required("Email is required"),
  password: yup
    .string()
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
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), undefined], "Passwords do not match")
    .required("Please confirm your password"),
});
