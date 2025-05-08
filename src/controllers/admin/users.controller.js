import * as UserService from "../../services/admin/user.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import httpStatus from "http-status";
import { validateObjectId } from "../../utils/validateObjectId.js";
import logger from "../../utils/logger.js";
import useragent from 'express-useragent';


/**
 * Create a new user
 * @route POST /api/v1/admin/users
 * @access Private/Admin
 */

const createUser = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    password,
    role,
    isVerified,
    isActive,
  } = req.body;

  const avatar = req.files?.avatar?.[0]?.path || null;
  const coverImage = req.files?.coverImage?.[0]?.path || null;

  logger.info(`Creating new user: ${email}`);
  logger.info(`avatar: ${avatar}`);
  logger.info(`coverImage: ${coverImage}`);

  const user = await UserService.createUser(
    {
      firstName,
      lastName,
      email,
      phone,
      password,
      role: role || "author",
      isVerified: isVerified || false,
      isActive: isActive !== false,
    },
    avatar,
    coverImage
  );

  logger.info(`User created successfully: ${user._id}`);

  return res
    .status(httpStatus.CREATED)
    .json(
      new ApiResponse(httpStatus.CREATED, user, "User created successfully")
    );
});

/**
 * Get all users with filters & pagination
 * @route GET /api/v1/admin/users
 * @access Private/Admin
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const {
    search,
    role,
    isActive,
    isVerified,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  logger.info(`Fetching users with filters: ${JSON.stringify(req.query)}`);

  const users = await UserService.getAllUsers({
    search,
    role,
    isActive,
    isVerified,
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy,
    sortOrder,
  });

  return res
    .status(httpStatus.OK)
    .json(new ApiResponse(httpStatus.OK, users, "Users fetched successfully"));
});

/**
 * Get single user by ID
 * @route GET /api/v1/admin/users/:id
 * @access Private/Admin
 */
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  logger.info(`Fetching user by ID: ${id}`);

  if (!validateObjectId(id)) {
    logger.warn(`Invalid user ID: ${id}`);
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user ID");
  }

  const user = await UserService.getUserById(id);

  if (!user) {
    logger.warn(`User not found: ${id}`);
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  return res
    .status(httpStatus.OK)
    .json(new ApiResponse(httpStatus.OK, user, "User fetched successfully"));
});

/**
 * Update user by ID
 * @route PATCH /api/v1/admin/users/:id
 * @access Private/Admin
 */
const updateUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!validateObjectId(id)) {
    logger.warn(`Invalid user ID: ${id}`);
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user ID");
  }

  const updates = { ...req.body };

  // Optional: Handle avatar and cover image if files are provided
  const avatar = req.files?.avatar?.[0]?.path || null;
  const coverImage = req.files?.coverImage?.[0]?.path || null;

  logger.info(`Updating user: ${id}`);
  logger.info(`avatar: ${avatar}`);
  logger.info(`coverImage: ${coverImage}`);

  const updatedUser = await UserService.updateUserById(
    id,
    updates,
    avatar,
    coverImage
  );

  if (!updatedUser) {
    logger.warn(`User not found for update: ${id}`);
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  logger.info(`User updated successfully: ${updatedUser._id}`);

  return res
    .status(httpStatus.OK)
    .json(
      new ApiResponse(httpStatus.OK, updatedUser, "User updated successfully")
    );
});

/**
 * Soft delete user by ID
 * @route DELETE /api/v1/admin/users/:id
 * @access Private/Admin
 */
const deleteUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  logger.info(`Deleting user: ${id}`);

  if (!validateObjectId(id)) {
    logger.warn(`Invalid user ID: ${id}`);
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user ID");
  }

  const deletedUser = await UserService.deleteUserById(id);

  if (!deletedUser) {
    logger.warn(`User not found for deletion: ${id}`);
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  return res
    .status(httpStatus.OK)
    .json(
      new ApiResponse(httpStatus.OK, deletedUser, "User deleted successfully")
    );
});

/**
 * Login user by email and password
 * @route DELETE /api/v1/admin/users/login
 * @access Public/Admin
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const deviceInfo = useragent.parse(req.headers["user-agent"]);
  const ipAddress = req.ip || req.connection.remoteAddress;

  logger.info(`Login request received for email: ${email}`);
  logger.debug(`Device info: ${JSON.stringify(deviceInfo)} | IP: ${ipAddress}`);

  try {
    const result = await UserService.loginUser(email, password, deviceInfo, ipAddress);

    // Set refreshToken as HTTP-only cookie
    res.cookie("refreshToken", result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    logger.info(`Login successful for user: ${result.user._id}`);

    return res
      .status(httpStatus.OK)
      .json(
        new ApiResponse(
          httpStatus.OK,
          { user: result.user, accessToken: result.tokens.accessToken,refreshToken: result.tokens.refreshToken },
          "Login successful"
        )
      );
  } catch (error) {
    logger.error(`Login failed for email: ${email} | Reason: ${error.message}`);
    throw error;
  }
});

const logout = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  logger.info(`Logout request received for user: ${userId}`);

  await UserService.logoutUser(userId);

  // Clear the refresh token cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  logger.info(`Refresh token cookie cleared for user: ${userId}`);

  return res
    .status(httpStatus.OK)
    .json(new ApiResponse(httpStatus.OK, null, "Logout successful"));
});


export {
  createUser,
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  login,
  logout,
};
