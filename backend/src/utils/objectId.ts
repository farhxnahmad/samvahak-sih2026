export const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
export const isValidObjectId = (v: unknown): v is string => typeof v === "string" && OBJECT_ID_RE.test(v);
