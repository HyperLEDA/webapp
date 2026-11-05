import { expect, it, vi } from "vitest";
import { queryTap } from "./tapQuery";

function tapFetch(body: string, type: string) {
  const init = { status: 200, headers: { "content-type": type } };
  return vi.fn<typeof fetch>().mockResolvedValue(new Response(body, init));
}

it("queries TAP", async () => {
  const payload = {
    columns: [{ name: "pgc", datatype: "int" }],
    data: [[1]],
  };
  const ok = tapFetch(JSON.stringify(payload), "application/json");
  const row = await queryTap("https://t/tap", "SELECT 1", ok);
  const body = String(ok.mock.calls[0][1]?.body);
  expect(row.resource.table.data).toEqual(payload.data);
  expect(body).toContain("LANG=ADQL&QUERY=SELECT+1&MAXREC=50&FORMAT=json");
  const errorXml = `<INFO name="QUERY_STATUS" value="ERROR">nope</INFO>`;
  const bad = tapFetch(errorXml, "text/xml");
  await expect(queryTap("https://t/tap", "SELECT 1", bad)).rejects.toThrow(
    "nope",
  );
});
