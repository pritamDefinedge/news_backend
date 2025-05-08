import * as AuthorService from "../../services/admin/author.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import httpStatus from "http-status";
import { validateObjectId } from "../../utils/validateObjectId.js";
import logger from "../../utils/logger.js";
import useragent from 'express-useragent';


/**
 * Create a new AuthorService
 * @route POST /api/v1/admin/authors
 * @access Private/Admin
 */

const createAuthor = asyncHandler(async (req, res) => {
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

  logger.info(`Creating new Author: ${email}`);
  logger.info(`avatar: ${avatar}`);
  logger.info(`coverImage: ${coverImage}`);

  const author = await AuthorService.createAuthor(
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

  logger.info(`author created successfully: ${author._id}`);

  return res
    .status(httpStatus.CREATED)
    .json(
      new ApiResponse(httpStatus.CREATED, author, "author created successfully")
    );
});

/**
 * Get all Author with filters & pagination
 * @route GET /api/v1/admin/authors
 * @access Private/Admin
 */
const getAllAuthors = asyncHandler(async (req, res) => {
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

  logger.info(`Fetching Author with filters: ${JSON.stringify(req.query)}`);

  const author = await AuthorService.getAllAuthors({
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
    .json(new ApiResponse(httpStatus.OK, author, "Author fetched successfully"));
});

/**
 * Get single Author by ID
 * @route GET /api/v1/admin/Author/:id
 * @access Private/Admin
 */
const getAuthorById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  logger.info(`Fetching author by ID: ${id}`);

  if (!validateObjectId(id)) {
    logger.warn(`Invalid Author ID: ${id}`);
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid Author ID");
  }

  const author = await AuthorService.getAuthorById(id);

  if (!author) {
    logger.warn(`User not found: ${id}`);
    throw new ApiError(httpStatus.NOT_FOUND, "Author not found");
  }

  return res
    .status(httpStatus.OK)
    .json(new ApiResponse(httpStatus.OK, author, "Author fetched successfully"));
});

/**
 * Update author by ID
 * @route PATCH /api/v1/admin/author/:id
 * @access Private/Admin
 */
const updateAuthorById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!validateObjectId(id)) {
    logger.warn(`Invalid author ID: ${id}`);
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid author ID");
  }

  const updates = { ...req.body };

  // Optional: Handle avatar and cover image if files are provided
  const avatar = req.files?.avatar?.[0]?.path || null;
  const coverImage = req.files?.coverImage?.[0]?.path || null;

  logger.info(`Updating Author: ${id}`);
  logger.info(`avatar: ${avatar}`);
  logger.info(`coverImage: ${coverImage}`);

  const updatedAuthor = await AuthorService.updateAuthorById(
    id,
    updates,
    avatar,
    coverImage
  );

  if (!updatedAuthor) {
    logger.warn(`Author not found for update: ${id}`);
    throw new ApiError(httpStatus.NOT_FOUND, "Author not found");
  }

  logger.info(`Author updated successfully: ${updatedAuthor._id}`);

  return res
    .status(httpStatus.OK)
    .json(
      new ApiResponse(httpStatus.OK, updatedAuthor, "Author updated successfully")
    );
});

/**
 * Soft delete Author by ID
 * @route DELETE /api/v1/admin/authors/:id
 * @access Private/Admin
 */
const deleteAuthorById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  logger.info(`Deleting author: ${id}`);

  if (!validateObjectId(id)) {
    logger.warn(`Invalid Author ID: ${id}`);
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid Author ID");
  }

  const deletedAuthor = await AuthorService.deleteAuthorById(id);

  if (!deletedAuthor) {
    logger.warn(`Author not found for deletion: ${id}`);
    throw new ApiError(httpStatus.NOT_FOUND, "Author not found");
  }

  return res
    .status(httpStatus.OK)
    .json(
      new ApiResponse(httpStatus.OK, deletedAuthor, "Author deleted successfully")
    );
});

/**
 * Login Author by email and password
 * @route DELETE /api/v1/admin/author/login
 * @access Public/Admin
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const deviceInfo = useragent.parse(req.headers["user-agent"]);
  const ipAddress = req.ip || req.connection.remoteAddress;

  logger.info(`Login request received for email: ${email}`);
  logger.debug(`Device info: ${JSON.stringify(deviceInfo)} | IP: ${ipAddress}`);

  try {
    const result = await AuthorService.loginAuthor(email, password, deviceInfo, ipAddress);

    // Set refreshToken as HTTP-only cookie
    res.cookie("refreshToken", result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    logger.info(`Login successful for Author: ${result.author._id}`);

    return res
      .status(httpStatus.OK)
      .json(
        new ApiResponse(
          httpStatus.OK,
          { author: result.author, accessToken: result.tokens.accessToken,refreshToken: result.tokens.refreshToken },
          "Login successful"
        )
      );
  } catch (error) {
    logger.error(`Login failed for email: ${email} | Reason: ${error.message}`);
    throw error;
  }
});

const logout = asyncHandler(async (req, res) => {
  const authorId = req.author._id;

  logger.info(`Logout request received for author: ${authorId}`);

  await AuthorService.logoutAuthor(authorId);

  // Clear the refresh token cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  logger.info(`Refresh token cookie cleared for author: ${authorId}`);

  return res
    .status(httpStatus.OK)
    .json(new ApiResponse(httpStatus.OK, null, "Logout successful"));
});


export {
  createAuthor,
  getAllAuthors,
  getAuthorById,
  updateAuthorById,
  deleteAuthorById,
  login,
  logout,
};
