import Table from "../../index";

const tableWithSmallData = new Table("Clevo-Processed-Speech-Table");
const tableWithMediumData = new Table("Clevo-Raw-Speech-Table");
console.error = jest.fn();

beforeAll(async () => {
  //
});

test("Scan records", async () => {
  const result = await tableWithSmallData.scan();
  expect(result.Items).not.toBeNull();
  expect(result.Items.length > 0).toBe(true);
});

test("Multiple scan of records", async () => {
  // const result1 = await tableWithMediumData.scan();
  const result1 = await tableWithMediumData.scan({}, {}, { pagination: true });
  const result2 = await tableWithMediumData.scan({}, {}, { pagination: false });
  console.log("result1.Items.length", result1.Items.length);
  console.log("result2.Items.length", result2.Items.length);
  expect(result1.Items.length > 0).toBe(true);
  expect(result2.Items.length > 0).toBe(true);
  expect(result2.Items.length > result1.Items.length).toBe(true);
});
