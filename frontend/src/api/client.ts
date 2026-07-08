// Типизированный клиент API: типы генерируются из OpenAPI-схемы FastAPI
// командой `make types` (backend Pydantic -> openapi.json -> schema.d.ts).
// Поменялась модель на бэке — фронт не соберётся, пока не приведём в соответствие.
import createClient from "openapi-fetch";
import type { paths } from "./schema";

export const api = createClient<paths>({ baseUrl: "/" });
