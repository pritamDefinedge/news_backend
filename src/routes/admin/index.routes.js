import { Router } from "express";
import categoryRouter from "./category.routes.js";
import authRoute from "./author.routes.js";
const router = Router();


router.use("/categories", categoryRouter);
router.use("/authors", authRoute);

export default router;
