import { vi } from "vitest";
import type { ErplyBooksClient } from "../client.js";

export function createMockClient(): ErplyBooksClient {
  return {
    get: vi.fn(),
    getText: vi.fn(),
    post: vi.fn(),
    postMultipart: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getAllPages: vi.fn(),
    request: vi.fn(),
    getConfig: vi.fn(),
  } as unknown as ErplyBooksClient;
}
