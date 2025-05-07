import { Router } from "express";
import * as UserController from "../../controllers/admin/users.controller.js";
import { upload } from "../../middlewares/multer.middleware.js";
import * as userValidation from "../../validations/users.validation.js";
import validate from "../../middlewares/validate.js";
import { verifyJWT } from "../../middlewares/users.auth.middleware.js";

const router = Router();

// Multer middleware for two image fields
const uploadFields = upload.fields([
  { name: "avatar", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
]);

// Create user
router.post(
  "/",
  uploadFields,
  validate(userValidation.createUser),
  UserController.createUser
);

// Get all users
router.get(
  "/",
  validate(userValidation.getAllUsers),
  UserController.getAllUsers
);

// Get user by ID
router.get(
  "/:id",
  validate(userValidation.getUserById),
  UserController.getUserById
);

// Update user
router.patch(
  "/:id",
  uploadFields,
  validate(userValidation.updateUserById),
  UserController.updateUserById
);

// Delete user
router.delete(
  "/:id",
  validate(userValidation.deleteUserById),
  UserController.deleteUserById
);

router.post("/login", validate(userValidation.loginValidation),  UserController.login);
router.post("/logout", verifyJWT, UserController.logout);

export default router;
