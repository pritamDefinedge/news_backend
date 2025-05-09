import Joi from "joi";

const createCategory = {
  body: Joi.object({
    title: Joi.string().min(3).max(50).required(),
    order: Joi.number().default(0),
    isActive: Joi.boolean().default(true),
  }),
};

const getAllCategories = {
  query: Joi.object({
    search: Joi.string().optional(), 
    isActive: Joi.boolean().optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10), 
    sortBy: Joi.string().valid("title", "order", "createdAt").default("order"), 
    sortOrder: Joi.string().valid("asc", "desc").default("asc"),
  }),
};

const getCategoryById = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

const updateCategoryById = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    title: Joi.string().min(3).max(50).optional(),
    order: Joi.number().optional(),
    isActive: Joi.boolean().default(true),
  }),
};

const deleteCategoryById = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

const getCategoriesWithNewsCount = {
  query: Joi.object({}).optional(),
};

export {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategoryById,
  deleteCategoryById,
  getCategoriesWithNewsCount,
};
