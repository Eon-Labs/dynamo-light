import Table from "../../index";

const tableWithPrimaryKey = new Table("Clevo-Processed-Speech-Table");
// const tableWithSortKey = new Transaction();
console.error = jest.fn();

beforeAll(async () => {
  // await tableWithPrimaryKey.create({ key: "123" });
});

test("Scan all records", async () => {
  const result = await tableWithPrimaryKey.scan({}, {}, { pagination: false });
  expect(result.Item).not.toBeNull();
  expect(result.Items.length > 0).toBe(true);
});
