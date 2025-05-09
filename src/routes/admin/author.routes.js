import { Router } from "express";
import * as AuthorController from "../../controllers/admin/author.controller.js";
import { upload } from "../../middlewares/multer.middleware.js";
import * as authorValidation from "../../validations/author.validation.js";
import validate from "../../middlewares/validate.js";
import { verifyJWT } from "../../middlewares/author.auth.middleware.js";

const router = Router();

// Multer middleware for two image fields
const uploadFields = upload.fields([
  { name: "avatar", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
]);

// Create Author
router.post(
  "/",
  verifyJWT,
  uploadFields,
  validate(authorValidation.createAuthor),
  AuthorController.createAuthor
);

// Get all Author
router.get(
  "/",
  verifyJWT,
  validate(authorValidation.getAllAuthors),
  AuthorController.getAllAuthors
);

// Get Author by ID
router.get(
  "/:id",
  verifyJWT,
  validate(authorValidation.getAuthorById),
  AuthorController.getAuthorById
);

// Update Author
router.put(
  "/:id",
  verifyJWT,
  uploadFields,
  validate(authorValidation.updateAuthorById),
  AuthorController.updateAuthorById
);

router.put(
  "/:id/status",
  verifyJWT,
  validate(authorValidation.updateAuthorStatus),
  AuthorController.updateAuthorStatus
);

// Delete Author
router.delete(
  "/:id",
  verifyJWT,
  validate(authorValidation.deleteAuthorById),
  AuthorController.deleteAuthorById
);

router.post("/login", validate(authorValidation.loginValidation),  AuthorController.login);
router.post("/logout", verifyJWT, AuthorController.logout);

export default router;
