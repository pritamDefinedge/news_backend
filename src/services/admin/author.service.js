import Author from "../../models/author.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../../utils/cloudinary.js";
import { ApiError } from "../../utils/ApiError.js";
import httpStatus from "http-status";
import logger from "../../utils/logger.js";

/**
 * Create a new Author
 * @param {Object} authorData - Author data
 * @param {Object} imagePaths - Paths for avatar and cover images
 * @returns {Promise<Object>} Created Author
 */
const createAuthor = async (authorData, avatarImg, coverImg) => {
  const { email, phone } = authorData;

  logger.info(`Creating new author: ${email}`);

  const existingAuthor = await Author.findOne({
    $or: [{ email }, { phone }],
    isDeleted: { $ne: true },
  });

  if (existingAuthor) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "Author with this email or phone already exists"
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

  const newAuthor = await Author.create({
    ...authorData,
    avatar: avatarUrl,
    coverImage: coverImageUrl,
  });

  logger.info(`Author created: ${newAuthor._id}`);
  return newAuthor;
};

/**
 * Get all Author with filtering
 */
const getAllAuthors = async (filters) => {
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

  const [authors, total] = await Promise.all([
    Author.find(query).sort(sort).skip(skip).limit(limit),
    Author.countDocuments(query),
  ]);

  return {
    authors,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get Author by ID
 */
const getAuthorById = async (id) => {
  const author = await Author.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!author) throw new ApiError(httpStatus.NOT_FOUND, "Author not found");
  return author;
};

/**
 * Update Author
 */

const updateAuthorById = async (id, updateData, avatarImg, coverImg) => {
  const author = await Author.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!author) {
    throw new ApiError(httpStatus.NOT_FOUND, "Author not found");
  }

  // Upload and update avatar if provided
  if (avatarImg) {
    const uploadedAvatar = await uploadOnCloudinary(avatarImg);
    if (!uploadedAvatar?.url) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Failed to upload avatar");
    }

    // Delete previous avatar from Cloudinary

    if (author.avatar) {
      try {
        await deleteFromCloudinary(author.avatar);
        logger.info(
          `Old image deleted from Cloudinary for category: ${author.avatar}`
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

    if (author.coverImage) {
      try {
        await deleteFromCloudinary(author.coverImage);
        logger.info(
          `Old image deleted from Cloudinary for category: ${author.coverImage}`
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

  // Update author fields
  const updatedAuthor = await Author.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  return updatedAuthor;
};

/**
 * Soft delete Author
 */
const deleteAuthorById = async (id) => {
  const author = await Author.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!author) throw new ApiError(httpStatus.NOT_FOUND, "Author not found");

  const deletedAuthor = await Author.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );
  return deletedAuthor;
};

const generateTokens = async (author) => {
  try {
    const accessToken = author.generateAccessToken();
    const refreshToken = author.generateRefreshToken();

    // Save refreshToken to Author document
    author.refreshToken = refreshToken;
    await author.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    logger.error(`Token generation failed: ${error.message}`);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to generate tokens"
    );
  }
};

const loginAuthor = async (email, password, deviceInfo, ipAddress) => {
  logger.info(`Login attempt for email: ${email}`);

  try {
    const author = await Author.findByCredentials(email, password);
    if (!author) {
      logger.warn(`Invalid login attempt for email: ${email}`);
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    if (!author.isActive) {
      logger.warn(`Inactive author login attempt: ${email}`);
      throw new ApiError(httpStatus.FORBIDDEN, "Account is inactive");
    }

    if (!author.isVerified) {
      logger.warn(`Unverified author login attempt: ${email}`);
      throw new ApiError(httpStatus.FORBIDDEN, "Please verify your account first");
    }

    await author.recordLogin(deviceInfo, ipAddress);

    const accessToken = author.generateAccessToken();
    const refreshToken = author.generateRefreshToken();

    author.refreshToken = refreshToken;
    author.accessToken = accessToken;
    await author.save();

    logger.info(`Author logged in successfully: ${author._id}`);
    return {
      author: {
        _id: author._id,
        firstName: author.firstName,
        lastName: author.lastName,
        email: author.email,
        phone: author.phone,
        role: author.role,
        avatar: author.avatar,
        coverImage: author.coverImage,
        isVerified: author.isVerified,
        isActive: author.isActive,
        lastActive: author.lastActive,
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

const logoutAuthor = async (authorId) => {
  logger.info(`Attempting to log out author: ${authorId}`);

  try {
    const author = await Author.findByIdAndUpdate(
      authorId,
      {
        $unset: { refreshToken: "" },
        $set: { lastActive: new Date() },
      },
      { new: true }
    );

    if (!author) {
      logger.warn(`Logout failed: Author not found with ID ${authorId}`);
      throw new ApiError(httpStatus.NOT_FOUND, "Author not found");
    }

    logger.info(`Author logged out successfully: ${authorId}`);
    return { success: true };
  } catch (error) {
    logger.error(`Logout error for Author ${authorId}: ${error.message}`);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Logout failed");
  }
};

export {
  createAuthor,
  getAllAuthors,
  getAuthorById,
  updateAuthorById,
  deleteAuthorById,
  loginAuthor,
  logoutAuthor,
  
};
