import { Router } from "express";
import v1Router from "./v1.routes";

const apiRouter = Router();

// Versioning: add v2.routes.ts later and mount it at "/v2" without touching v1.
apiRouter.use("/v1", v1Router);

export default apiRouter;
