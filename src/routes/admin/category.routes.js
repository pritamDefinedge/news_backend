import { Router } from "express";
import * as CategoryController from "../../controllers/admin/category.controller.js";
import { upload } from "../../middlewares/multer.middleware.js";
import * as categoryValidation from "../../validations/category.validation.js";
import validate from "../../middlewares/validate.js";
import { verifyJWT } from "../../middlewares/users.auth.middleware.js";

const router = Router();

// verifyJWT,

// Create category
router.post(
  "/",
  upload.single("image"),
  validate(categoryValidation.createCategory),
  CategoryController.createCategory
);

// Get all categories
router.get(
  "/",
  validate(categoryValidation.getAllCategories),
  CategoryController.getAllCategories
);

// Get category by ID
router.get(
  "/:id",
  validate(categoryValidation.getCategoryById),
  CategoryController.getCategoryById
);

// Update category
router.patch(
  "/:id",
  upload.single("image"),
  validate(categoryValidation.updateCategoryById),
  CategoryController.updateCategoryById
);


// Delete category
router.delete(
  "/:id",
  validate(categoryValidation.deleteCategoryById),
  CategoryController.deleteCategoryById
);

// Get categories with news count
router.get(
  "/with-news-count/all",
  validate(categoryValidation.getCategoriesWithNewsCount),
  CategoryController.getCategoriesWithNewsCount
);

export default router;