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

  it("erply_daybook requires dates and GETs /reports/daybook", async () => {
    await expect(tools.erply_daybook.handler({})).rejects.toThrow(/dateFrom|dateTo/);
    vi.mocked(client.get).mockResolvedValue(reportsFixture.daybook);
    const result = await tools.erply_daybook.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      accountId: 1,
      start: 0,
      limit: 20,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/reports/daybook",
      expect.objectContaining({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
        accountId: 1,
        start: 0,
        limit: 20,
      }),
    );
    expect(JSON.parse(result.content[0].text).reportType).toBe("daybook");
  });

  it("erply_trial_balance GETs /reports/trial_balance", async () => {
    vi.mocked(client.get).mockResolvedValue(reportsFixture.trial_balance);
    const result = await tools.erply_trial_balance.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      getSummary: true,
      getConsolidated: true,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/reports/trial_balance",
      expect.objectContaining({
        getSummary: true,
        getConsolidated: true,
      }),
    );
    expect(JSON.parse(result.content[0].text).reportType).toBe("trial_balance");
  });

  it("erply_vat_ee GETs /reports/tax/ee/vat", async () => {
    vi.mocked(client.get).mockResolvedValue(reportsFixture.vat_ee);
    const result = await tools.erply_vat_ee.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-03-31",
      showSales: true,
      showPurchases: true,
      cashBasis: false,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/reports/tax/ee/vat",
      expect.objectContaining({
        dateFrom: "2025-01-01",
        dateTo: "2025-03-31",
        showSales: true,
        showPurchases: true,
        cashBasis: false,
      }),
    );
    expect(JSON.parse(result.content[0].text).reportType).toBe("vat_ee");
  });

  it("erply_contact_balance GETs /reports/contact_balance", async () => {
    vi.mocked(client.get).mockResolvedValue(reportsFixture.contact_balance);
    const result = await tools.erply_contact_balance.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      customerId: 10,
      showOnlyOverdue: true,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/reports/contact_balance",
      expect.objectContaining({
        customerId: 10,
        showOnlyOverdue: true,
      }),
    );
    expect(JSON.parse(result.content[0].text).reportType).toBe("contact_balance");
  });

  it("erply_fixed_assets GETs /reports/fixed_assets", async () => {
    vi.mocked(client.get).mockResolvedValue(reportsFixture.fixed_assets);
    const result = await tools.erply_fixed_assets.handler({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      getFixedAssets: true,
      articleId: 3,
    });
    expect(client.get).toHaveBeenCalledWith(
      "/reports/fixed_assets",
      expect.objectContaining({
        getFixedAssets: true,
        articleId: 3,
      }),
    );
    expect(JSON.parse(result.content[0].text).reportType).toBe("fixed_assets");
  });
});
