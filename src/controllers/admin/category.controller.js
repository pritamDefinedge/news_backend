import * as CategoryService from "../../services/admin/category.service.js";
import { ApiError } from "../../utils/ApiError.js";
import httpStatus from "http-status";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validateObjectId } from "../../utils/validateObjectId.js";
import logger from "../../utils/logger.js";

/**
 * Create a new category
 * @route POST /api/v1/admin/categories
 * @access Private/Admin
 */
const createCategory = asyncHandler(async (req, res) => {
  const { title, order, isActive } = req.body;
  const image = req.file?.path;

  logger.info(`Creating new category: ${title} `);
  logger.info(`Creating new isActive: ${isActive} `);

  if (!image) {
    logger.warn("Category creation failed: Image is required");
    throw new ApiError(httpStatus.BAD_REQUEST, "Category image is required");
  }

  const newCategory = await CategoryService.createCategory(
    {
      title,
      order: order || 0,
      isActive,
    },
    image
  );

  logger.info(`Category created successfully: ${newCategory._id}`);

  return res
    .status(httpStatus.CREATED)
    .json(
      new ApiResponse(
        httpStatus.CREATED,
        newCategory,
        "Category created successfully"
      )
    );
});

/**
 * Get all categories with pagination and filtering
 * @route GET /api/v1/admin/categories
 * @access Private/Admin
 */
const getAllCategories = asyncHandler(async (req, res) => {
  const {
    search = "",  
    isActive,  
    page = 1,
    limit = 10,
    sortBy = "order",
    sortOrder = "asc",
  } = req.query;

  // Ensure pagination params are parsed as integers
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);

  // Validate sortOrder
  if (!["asc", "desc"].includes(sortOrder)) {
    return res.status(httpStatus.BAD_REQUEST).json(
      new ApiResponse(httpStatus.BAD_REQUEST, null, "Invalid sort order. Use 'asc' or 'desc'.")
    );
  }

  // Validate sortBy field
  const validSortFields = ["order", "title", "createdAt"]; // Adjust to your valid fields
  if (!validSortFields.includes(sortBy)) {
    return res.status(httpStatus.BAD_REQUEST).json(
      new ApiResponse(httpStatus.BAD_REQUEST, null, `Invalid sort field. Valid fields are: ${validSortFields.join(", ")}`)
    );
  }

  logger.info(`Fetching categories with filters: ${JSON.stringify(req.query)}`);

  try {
    const result = await CategoryService.getAllCategories({
      search,
      isActive,
      page: parsedPage,
      limit: parsedLimit,
      sortBy,
      sortOrder,
    });

    logger.info(`Retrieved ${result.categories.length} categories out of ${result.pagination.total}`);

    return res.status(httpStatus.OK).json(
      new ApiResponse(httpStatus.OK, result, "Categories fetched successfully")
    );
  } catch (error) {
    logger.error(`Error fetching categories: ${error.message}`);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
      new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, null, "Failed to fetch categories")
    );
  }
});

/**
 * Get category by ID
 * @route GET /api/v1/admin/categories/:id
 * @access Private/Admin
 */
const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  logger.info(`Fetching category by ID: ${id}`);

  if (!validateObjectId(id)) {
    logger.warn(`Invalid category ID format: ${id}`);
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid category ID");
  }

  const category = await CategoryService.getCategoryById(id);

  if (!category) {
    logger.warn(`Category not found with ID: ${id}`);
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }

  logger.info(`Category found: ${category.title}`);

  return res
    .status(httpStatus.OK)
    .json(
      new ApiResponse(httpStatus.OK, category, "Category fetched successfully")
    );
});

/**
 * Update category by ID
 * @route PATCH /api/v1/admin/categories/:id
 * @access Private/Admin
 */
const updateCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, order, isActive } = req.body;
  const image = req.file?.path;

  logger.info(`Updating category: ${id}`);

  if (!validateObjectId(id)) {
    logger.warn(`Invalid category ID format: ${id}`);
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid category ID");
  }

  const updatedCategory = await CategoryService.updateCategoryById(
    id,
    {
      title,
      order,
      isActive,
    },
    image
  );

  if (!updatedCategory) {
    logger.warn(`Category not found for update: ${id}`);
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }

  logger.info(`Category updated successfully: ${id}`);

  return res
    .status(httpStatus.OK)
    .json(
      new ApiResponse(
        httpStatus.OK,
        updatedCategory,
        "Category updated successfully"
      )
    );
});

/**
 * Delete category by ID (soft delete)
 * @route DELETE /api/v1/admin/categories/:id
 * @access Private/Admin
 */
const deleteCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  logger.info(`Attempting to delete category: ${id}`);

  if (!validateObjectId(id)) {
    logger.warn(`Invalid category ID format: ${id}`);
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid category ID");
  }

  const deletedCategory = await CategoryService.deleteCategoryById(id);

  if (!deletedCategory) {
    logger.warn(`Category not found for deletion: ${id}`);
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }

  logger.info(`Category deleted successfully: ${id}`);

  return res
    .status(httpStatus.OK)
    .json(
      new ApiResponse(
        httpStatus.OK,
        deletedCategory,
        "Category deleted successfully"
      )
    );
});

/**
 * Get categories with news count
 * @route GET /api/v1/admin/categories/with-news-count
 * @access Private/Admin
 */
const getCategoriesWithNewsCount = asyncHandler(async (req, res) => {
  const categories = await CategoryService.getCategoriesWithNewsCount();
  return res
    .status(httpStatus.OK)
    .json(
      new ApiResponse(
        httpStatus.OK,
        categories,
        "Categories with news count fetched successfully"
      )
    );
});

export {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategoryById,
  deleteCategoryById,
  getCategoriesWithNewsCount,
};
