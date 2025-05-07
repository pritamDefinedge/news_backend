import User from "../../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../../utils/cloudinary.js";
import { ApiError } from "../../utils/ApiError.js";
import httpStatus from "http-status";
import logger from "../../utils/logger.js";

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {Object} imagePaths - Paths for avatar and cover images
 * @returns {Promise<Object>} Created user
 */
const createUser = async (userData, avatarImg, coverImg) => {
  const { email, phone } = userData;

  logger.info(`Creating new user: ${email}`);

  const existingUser = await User.findOne({
    $or: [{ email }, { phone }],
    isDeleted: { $ne: true },
  });

  if (existingUser) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "User with this email or phone already exists"
    );
  }

  // Upload avatar and cover image if provided
  let avatarUrl, coverImageUrl;

  if (avatarImg) {
    const avatar = await uploadOnCloudinary(avatarImg);
    if (!avatar?.url)
      throw new ApiError(httpStatus.BAD_REQUEST, "Failed to upload avatar");
    avatarUrl = avatar.url;
  }

  if (coverImg) {
    const coverImage = await uploadOnCloudinary(coverImg);
    if (!coverImage?.url)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Failed to upload cover image"
      );
    coverImageUrl = coverImage.url;
  }

  const newUser = await User.create({
    ...userData,
    avatar: avatarUrl,
    coverImage: coverImageUrl,
  });

  logger.info(`User created: ${newUser._id}`);
  return newUser;
};

/**
 * Get all users with filtering
 */
const getAllUsers = async (filters) => {
  const {
    search,
    role,
    isActive,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  const query = { isDeleted: { $ne: true } };

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

  const [users, total] = await Promise.all([
    User.find(query).sort(sort).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);

  return {
    users,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get user by ID
 */
const getUserById = async (id) => {
  const user = await User.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  return user;
};

/**
 * Update user
 */

const updateUserById = async (id, updateData, avatarImg, coverImg) => {
  const user = await User.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Upload and update avatar if provided
  if (avatarImg) {
    const uploadedAvatar = await uploadOnCloudinary(avatarImg);
    if (!uploadedAvatar?.url) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Failed to upload avatar");
    }

    // Delete previous avatar from Cloudinary

    if (user.avatar) {
      try {
        await deleteFromCloudinary(user.avatar);
        logger.info(
          `Old image deleted from Cloudinary for category: ${user.avatar}`
        );
      } catch (error) {
        logger.error(
          `Error deleting old image from Cloudinary: ${error.message}`
        );
        // Continue with update even if deletion fails
      }
    }

    updateData.avatar = uploadedAvatar.url;
  }

  // Upload and update cover image if provided
  if (coverImg) {
    const uploadedCover = await uploadOnCloudinary(coverImg);
    if (!uploadedCover?.url) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Failed to upload cover image"
      );
    }

    // Delete previous coverImage from Cloudinary

    if (user.coverImage) {
      try {
        await deleteFromCloudinary(user.coverImage);
        logger.info(
          `Old image deleted from Cloudinary for category: ${user.coverImage}`
        );
      } catch (error) {
        logger.error(
          `Error deleting old image from Cloudinary: ${error.message}`
        );
        // Continue with update even if deletion fails
      }
    }

    updateData.coverImage = uploadedCover.url;
  }

  // Update user fields
  const updatedUser = await User.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  return updatedUser;
};

/**
 * Soft delete user
 */
const deleteUserById = async (id) => {
  const user = await User.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

  const deletedUser = await User.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );
  return deletedUser;
};

const generateTokens = async (user) => {
  try {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save refreshToken to user document
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    logger.error(`Token generation failed: ${error.message}`);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to generate tokens"
    );
  }
};

const loginUser = async (email, password, deviceInfo, ipAddress) => {
  logger.info(`Login attempt for email: ${email}`);

  try {
    const user = await User.findByCredentials(email, password);
    if (!user) {
      logger.warn(`Invalid login attempt for email: ${email}`);
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    if (!user.isActive) {
      logger.warn(`Inactive user login attempt: ${email}`);
      throw new ApiError(httpStatus.FORBIDDEN, "Account is inactive");
    }

    if (!user.isVerified) {
      logger.warn(`Unverified user login attempt: ${email}`);
      throw new ApiError(httpStatus.FORBIDDEN, "Please verify your account first");
    }

    await user.recordLogin(deviceInfo, ipAddress);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    user.accessToken = accessToken;
    await user.save();

    logger.info(`User logged in successfully: ${user._id}`);
    return {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        coverImage: user.coverImage,
        isVerified: user.isVerified,
        isActive: user.isActive,
        lastActive: user.lastActive,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  } catch (error) {
    logger.error(`Login error for ${email}: ${error.message}`);
    throw error;
  }
};

const logoutUser = async (userId) => {
  logger.info(`Attempting to log out user: ${userId}`);

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $unset: { refreshToken: "" },
        $set: { lastActive: new Date() },
      },
      { new: true }
    );

    if (!user) {
      logger.warn(`Logout failed: user not found with ID ${userId}`);
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    logger.info(`User logged out successfully: ${userId}`);
    return { success: true };
  } catch (error) {
    logger.error(`Logout error for user ${userId}: ${error.message}`);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Logout failed");
  }
};

export {
  createUser,
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  loginUser,
  logoutUser,
};
