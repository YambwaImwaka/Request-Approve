import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import applicationsRouter from "./applications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(applicationsRouter);

export default router;
