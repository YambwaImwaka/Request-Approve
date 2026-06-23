---
name: Orval + file upload endpoints
description: Never put multipart file upload endpoints in the OpenAPI spec — orval generates browser-only types that break the Node tsconfig.
---

When an OpenAPI endpoint has `multipart/form-data` with `format: binary`, orval generates:
- `zod.instanceof(File)` in the Zod schema
- `file: Blob` in the TypeScript type

Both require browser globals (`File`, `Blob`) which are not available in the api-zod lib's Node tsconfig — causing `TS2304: Cannot find name 'File'`.

**Why:** The api-zod lib is compiled as a Node package. Browser globals require `"lib": ["dom"]` in tsconfig.

**How to apply:** For file upload endpoints, handle them with a custom Express route (using `multer`) and a custom frontend fetch hook. Do NOT define the upload endpoint in `openapi.yaml`.
