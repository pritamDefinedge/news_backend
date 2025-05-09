import Category from "../../models/category.model.js";
import { uploadOnCloudinary,deleteFromCloudinary } from "../../utils/cloudinary.js";
import { ApiError } from "../../utils/ApiError.js";
import httpStatus from "http-status";
import logger from "../../utils/logger.js";

/**
 * Create a new category
 * @param {Object} categoryData - Category data
 * @param {string} imageLocalPath - Path to the uploaded image
 * @returns {Promise<Object>} Created category
 */
const createCategory = async (categoryData, imageLocalPath) => {
  const { title, order = 0, isActive } = categoryData;

  logger.info(`Creating new category: ${title}`);

  // Check for existing category with same title
  const existingCategory = await Category.findOne({ 
    title: { $regex: new RegExp(`^${title}$`, 'i') },
    isDeleted: { $ne: true }
  });

  if (existingCategory) {
    logger.warn(`Category already exists: ${title}`);
    throw new ApiError(httpStatus.CONFLICT, "Category with this title already exists");
  }

  // Upload image to Cloudinary
  let imageUrl;
  if (imageLocalPath) {
    try {
      const image = await uploadOnCloudinary(imageLocalPath);
      if (!image?.url) {
        logger.error("Failed to upload category image");
        throw new ApiError(httpStatus.BAD_REQUEST, "Failed to upload category image");
      }
      imageUrl = image.url;
    } catch (error) {
      logger.error(`Error uploading image: ${error.message}`);
      throw new ApiError(httpStatus.BAD_REQUEST, "Error uploading category image");
    }
  }

  // Create the category
  const category = await Category.create({
    title,
    order,
    isActive,
    image: imageUrl
  });

  logger.info(`Category created successfully: ${category._id}`);
  return category;
};

/**
 * Get all categories with pagination and filtering
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Paginated categories
 */
const getAllCategories = async (filters) => {
  const { 
    search = "", 
    isActive,  
    page = 1, 
    limit = 10, 
    sortBy = "order", 
    sortOrder = "asc" 
  } = filters;

  logger.info(`Fetching categories with filters: ${JSON.stringify(filters)}`);

  const query = { isDeleted: { $ne: true } };

  // Apply search filter if provided
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Apply isActive filter if provided
  if (isActive !== undefined) query.isActive = isActive;

  // Set up pagination
  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  try {
    const [categories, total] = await Promise.all([
      Category.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Category.countDocuments(query)
    ]);

    logger.info(`Fetched ${categories.length} categories out of ${total} total`);

    return {
      categories,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / limit),
      }
    };
  } catch (error) {
    logger.error(`Error fetching categories: ${error.message}`);
    throw new Error('Failed to fetch categories');
  }
};

/**
 * Get category by ID
 * @param {string} id - Category ID
 * @returns {Promise<Object>} Category
 */
const getCategoryById = async (id) => {
  logger.info(`Fetching category by ID: ${id}`);

  const category = await Category.findOne({ 
    _id: id, 
    isDeleted: { $ne: true } 
  });

  if (!category) {
    logger.warn(`Category not found: ${id}`);
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }

  return category;
};

/**
 * Update category by ID
 * @param {string} id - Category ID
 * @param {Object} updateData - Update data
 * @param {string} imageLocalPath - Path to new image
 * @returns {Promise<Object>} Updated category
 */
const updateCategoryById = async (id, updateData, imageLocalPath) => {
  const { title, order, isActive } = updateData;

  logger.info(`Updating category: ${id}`);

  // Check if category exists
  const category = await Category.findOne({ 
    _id: id, 
    isDeleted: { $ne: true } 
  });

  if (!category) {
    logger.warn(`Category not found for update: ${id}`);
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }

  // Check for duplicate title if title is being updated
  if (title && title !== category.title) {
    const existingCategory = await Category.findOne({
      title: { $regex: new RegExp(`^${title}$`, 'i') },
      _id: { $ne: id },
      isDeleted: { $ne: true }
    });

    if (existingCategory) {
      logger.warn(`Category title already exists: ${title}`);
      throw new ApiError(httpStatus.CONFLICT, "Category with this title already exists");
    }
  }

  // Prepare update object
  const updateFields = {
    ...(title && { title }),
    ...(order !== undefined && { order }),
    ...(isActive && { isActive })
  };

  // Handle image update
  // Handle image update
  if (imageLocalPath) {
    // Upload new image
    const image = await uploadOnCloudinary(imageLocalPath);
    if (!image?.url) {
      logger.error("Failed to upload new category image");
      throw new ApiError(httpStatus.BAD_REQUEST, "Failed to upload category image");
    }
    
    // Delete old image if it exists
    if (category.image) {
      try {
        await deleteFromCloudinary(category.image);
        logger.info(`Old image deleted from Cloudinary for category: ${category.image}`);
      } catch (error) {
        logger.error(`Error deleting old image from Cloudinary: ${error.message}`);
        // Continue with update even if deletion fails
      }
    }
    
    updateFields.image = image.url;
  }

  // Perform the update
  const updatedCategory = await Category.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { 
      new: true,
      runValidators: true
    }
  );

  logger.info(`Category updated successfully: ${id}`);
  return updatedCategory;
};


/**
 * Soft delete a category
 * @param {string} id - Category ID
 * @returns {Promise<Object>} Deleted category
 */

const deleteCategoryById = async (id) => {
  logger.info(`Attempting to delete category: ${id}`);

  // First find the category to get the image URL
  const category = await Category.findOne({ 
    _id: id, 
    isDeleted: { $ne: true } 
  });

  if (!category) {
    logger.warn(`Category not found for deletion: ${id}`);
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }

  // Mark as deleted in database
  const deletedCategory = await Category.findByIdAndUpdate(
    id,
    { $set: { isDeleted: true } },
    { new: true }
  );

  // // Delete image from Cloudinary if it exists
  // if (category.image) {
  //   try {
  //     logger.info(`Attempting to delete image from Cloudinary for category: ${id}`);
  //     await deleteFromCloudinary(category.image);
  //     logger.info(`Successfully deleted image from Cloudinary for category: ${id}`);
  //   } catch (error) {
  //     logger.error(`Failed to delete image from Cloudinary for category ${id}: ${error.message}`);
  //     // Continue with deletion even if image deletion fails
  //   }
  // }

  logger.info(`Category and associated resources deleted successfully: ${id}`);
  return deletedCategory;
};

/**
 * Get categories with their news counts
 * @returns {Promise<Array>} Categories with news counts
 */
const getCategoriesWithNewsCount = async () => {
  logger.info("Fetching categories with news counts");

  return Category.aggregate([
    {
      $match: { isDeleted: { $ne: true } }
    },
    {
      $lookup: {
        from: "news",
        localField: "_id",
        foreignField: "category",
        as: "newsItems"
      }
    },
    {
      $addFields: {
        newsCount: { $size: "$newsItems" }
      }
    },
    {
      $project: {
        newsItems: 0
      }
    },
    {
      $sort: { order: 1 }
    }
  ]);
};

export {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategoryById,
  deleteCategoryById,
  getCategoriesWithNewsCount
};