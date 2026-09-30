import multer from "multer";
import { AppError } from "../utils/AppError";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILES = 5;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

/** Memory storage: files stay as buffers, never touch disk, and go straight to Cloudinary. */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new AppError(400, "Only JPEG, PNG, WEBP or HEIC images are allowed"));
    }
    cb(null, true);
  },
});

/** Field name in the multipart form: "images". Up to 5 files, 5MB each. */
export const uploadIncidentImages = upload.array("images", MAX_FILES);
