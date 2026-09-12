// Generated client entrypoint — regenerate with `npm run generate` after any
// change to backend/api/openapi.yaml (CI enforces the client is up to date).
import createClient from "openapi-fetch";

import type { components, paths } from "./schema";

export type { components, paths };
export type ApiPaths = paths;
export type ApiError = components["schemas"]["Error"];

/** Typed fetch client. Web and admin apps configure baseUrl per environment. */
export const apiClient = createClient<paths>({ baseUrl: "/api/v1" });

export default apiClient;