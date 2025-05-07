import Joi from "joi";

const createCategory = {
  body: Joi.object({
    title: Joi.string().min(3).max(50).required(),
    order: Joi.number().default(0),
    status: Joi.string().valid("Active", "Blocked").default("Active"),
  })
};

const getAllCategories = {
  query: Joi.object({
    search: Joi.string().optional(),
    status: Joi.string().valid("Active", "Blocked").optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10),
    sortBy: Joi.string().valid("title", "order", "createdAt").default("order"),
    sortOrder: Joi.string().valid("asc", "desc").default("asc")
  })
};

const getCategoryById = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required()
  })
};

const updateCategoryById = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required()
  }),
  body: Joi.object({
    title: Joi.string().min(3).max(50).optional(),
    order: Joi.number().optional(),
    status: Joi.string().valid("Active", "Blocked").optional(),
  })
};

const deleteCategoryById = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required()
  })
};

const getCategoriesWithNewsCount = {
  query: Joi.object({}).optional() // No specific query params needed
};

export {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategoryById,
  deleteCategoryById,
  getCategoriesWithNewsCount
};