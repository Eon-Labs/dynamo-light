const Table = require("../../index");

const rawSpeechTable = new Table("Clevo-Processed-Speech-Table");
// const tableWithSortKey = new Transaction();
console.error = jest.fn();

describe("Simple method that will get an item in a table with a partition/sort key", () => {
  beforeAll(async () => {
    // await tableWithPrimaryKey.create({ key: "123" });
  });
  test("Grabs proper item given the right key", async () => {
    const key = { fileName: "20170623160058_966_13436475398_601" };
    const result = await rawSpeechTable.get(key);
    // const result = await tableWithPrimaryKey.get("20170623160058_966_13436475398_601");
    expect(result.Item).not.toBeNull();
    expect(result.Item.key).toBe("20170623160058_966_13436475398_601");
  });

  //   test("get non existing key should return {Item: null}", async () => {
  //     try {
  //       const key = { key: "nonexist" };
  //       const result = await tableWithPrimaryKey.get(key);
  //       expect(result.Item).toBeNull();
  //     } catch (err) {
  //       console.log("err", err);
  //     }
  //   });
  //   test("Grab key with ConsistentRead set to true", async () => {
  //     const key = { key: "123" };
  //     await tableWithPrimaryKey.update(key, { username: "wooj" });
  //     const result = await tableWithPrimaryKey.get(key, { ConsistentRead: true });
  //     expect(result.Item).not.toBeNull();
  //   });
  //   test("Grab Key but only specific attribute", async () => {
  //     const key = { key: "123" };
  //     await tableWithPrimaryKey.update(key, { username: "wooj" });
  //     const result = await tableWithPrimaryKey.get(key, { ProjectionExpression: "username" });
  //     expect(result.Item.key).toBeUndefined();
  //     expect(result.Item.username).toBe("wooj");
  //   });
  //   test("Grab Key with two options", async () => {
  //     const key = { key: "123" };
  //     const options = { ReturnConsumedCapacity: "INDEXES", ProjectionExpression: "username" };
  //     const result = await tableWithPrimaryKey.get(key, options);
  //     expect(result.ConsumedCapacity).toBeTruthy();
  //     expect(result.ConsumedCapacity.CapacityUnits).toBeTruthy();
  //     expect(result.Item.key).toBeUndefined();
  //     expect(result.Item.username).toBe("wooj");
  //   });

  //   // test("Grab item with both primary and sort key", async () => {
  //   //   const key = { username: "wooj", itemDateTime: 20190201 };
  //   //   const result = await tableWithSortKey.get(key);
  //   //   expect(result).not.toBeNull();
  //   //   expect(result.Item.username).toBe("wooj");
  //   //   expect(result.Item.isCompleted).toEqual(true);
  //   // });

  //   test(`If no key is provided returns "key is undefined!" message.`, async () => {
  //     const key = "";
  //     expect.assertions(1);
  //     try {
  //       await tableWithPrimaryKey.get(key);
  //     } catch (e) {
  //       expect(e.message).toBe("key is invalid");
  //     }
  //   });
  //   afterAll(async () => {
  //     await tableWithPrimaryKey.delete({
  //       key: "123"
  //     });
  //   });
});
