import { Router } from "express";
import categoryRouter from "./category.routes.js";
import usersRoute from "./users.routes.js";
const router = Router();


router.use("/categories", categoryRouter);
router.use("/users", usersRoute);

export default router;
