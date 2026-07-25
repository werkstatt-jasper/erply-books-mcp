import { beforeEach, describe, expect, it, vi } from "vitest";
import reportsFixture from "../__fixtures__/reports.json" with { type: "json" };
import type { ErplyBooksClient } from "../client.js";
import { createReportTools } from "./reports.js";
import { createMockClient } from "./test-helpers.js";

describe("report tools", () => {
  let client: ErplyBooksClient;
  let tools: ReturnType<typeof createReportTools>;

  beforeEach(() => {
    client = createMockClient();
    tools = createReportTools(client);
  });

  it("erply_balance_sheet requires dates and GETs /reports/balance_sheet", async () => {
    await expect(tools.erply_balance_sheet.handler({})).rejects.toThrow(/dateFrom|dateTo/);
    vi.mocked(client.get).mockResolvedValue(reportsFixture.balance_sheet);
    const result = await tools.erply_balance_sheet.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      removeZeroValues: true,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/reports/balance_sheet",
      expect.objectContaining({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
        removeZeroValues: true,
      }),
    );
    expect(JSON.parse(result.content[0].text).reportType).toBe("balance_sheet");
  });

  it("erply_income_sheet GETs /reports/income_sheet", async () => {
    vi.mocked(client.get).mockResolvedValue(reportsFixture.income_sheet);
    const result = await tools.erply_income_sheet.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
    });
    expect(client.get).toHaveBeenCalledWith(
      "/reports/income_sheet",
      expect.objectContaining({ dateFrom: "2025-01-01", dateTo: "2025-12-31" }),
    );
    expect(JSON.parse(result.content[0].text).reportType).toBe("income_sheet");
  });

  it("erply_aged_receivables GETs /reports/aged with filters", async () => {
    vi.mocked(client.get).mockResolvedValue(reportsFixture.aged);
    const result = await tools.erply_aged_receivables.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      customerId: 10,
      showOnlyOverdue: true,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/reports/aged",
      expect.objectContaining({
        customerId: 10,
        showOnlyOverdue: true,
      }),
    );
    expect(JSON.parse(result.content[0].text).reportType).toBe("aged");
  });

  it("erply_general_ledger GETs /reports/general_ledger", async () => {
    vi.mocked(client.get).mockResolvedValue(reportsFixture.general_ledger);
    const result = await tools.erply_general_ledger.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      accountId: 1,
      getSummary: true,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/reports/general_ledger",
      expect.objectContaining({
        accountId: 1,
        getSummary: true,
      }),
    );
    expect(JSON.parse(result.content[0].text).reportType).toBe("general_ledger");
  });
});
