import Joi from "joi";
import { objectId } from "./custom.validation.js";

const createUser = {
  body: Joi.object({
    firstName: Joi.string().min(2).max(50).required().messages({
      "string.empty": "First name is required",
      "string.min": "First name must be at least 2 characters",
      "string.max": "First name cannot exceed 50 characters",
    }),
    lastName: Joi.string().min(2).max(50).required().messages({
      "string.empty": "Last name is required",
      "string.min": "Last name must be at least 2 characters",
      "string.max": "Last name cannot exceed 50 characters",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "string.empty": "Email is required",
    }),
    phone: Joi.string()
      .pattern(/^[6-9]\d{9}$/)
      .required()
      .messages({
        "string.pattern.base":
          "Please provide a valid 10-digit Indian phone number",
        "string.empty": "Phone number is required",
      }),

    password: Joi.string().min(8).required().messages({
      "string.min": "Password must be at least 8 characters",
      "string.empty": "Password is required",
    }),
    role: Joi.string().valid("user", "admin", "moderator").default("user"),
    isVerified: Joi.boolean().default(false),
    isActive: Joi.boolean().default(true),
  }),
};

const getAllUsers = {
  query: Joi.object({
    search: Joi.string().optional(),
    role: Joi.string().valid("user", "admin", "moderator").optional(),
    isActive: Joi.boolean().optional(),
    isVerified: Joi.boolean().optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10),
    sortBy: Joi.string()
      .valid("firstName", "lastName", "email", "createdAt", "updatedAt")
      .default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

const getUserById = {
  params: Joi.object({
    id: Joi.string().custom(objectId).required(),
  }),
};

const updateUserById = {
  params: Joi.object({
    id: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional(),
    role: Joi.string().valid("user", "admin", "moderator").optional(),
    isVerified: Joi.boolean().optional(),
    isActive: Joi.boolean().optional()
  }).min(1), // At least one field must be provided
};

const deleteUserById = {
  params: Joi.object({
    id: Joi.string().custom(objectId).required(),
  }),
};


const loginValidation = {
  body: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "string.empty": "Email is required",
    }),
    password: Joi.string().required().messages({
      "string.empty": "Password is required",
    }),
  }),
};

export { createUser, getAllUsers, getUserById, updateUserById, deleteUserById,loginValidation };
