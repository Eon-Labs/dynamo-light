function convertNode(nodeName, nodeValue) {
  const value = Object.entries(nodeValue);
  if (value.length > 1) {
    throw new Error(`${nodeName} contains more than one value.`);
  }
  const [type, thisValue] = value[0];
  let convertedValue = null;
  switch (type) {
    case "S":
      convertedValue = thisValue;
      break;
    case "N":
      convertedValue = parseInt(thisValue);
      break;
    case "L":
      convertedValue = [];
      for (let i = 0; i < thisValue.length; i++) {
        convertedValue.push(convertNode(`${nodeName}\$${i}`, thisValue[i]));
      }
      break;
    case "M":
      convertedValue = {};
      for (const [key, value] of Object.entries(thisValue)) {
        convertedValue[key] = convertNode(key, value);
      }
      break;
    default:
      throw new Error(`${nodeName} is of unknown type ${type}`);
  }
  return convertedValue;
}

function convertRawSeeds(rawSeeds) {
  let converted = [];
  for (let i = 0; i < rawSeeds.length; i++) {
    const currentRow = rawSeeds[i];
    const rowResult = {};
    for (const [key, value] of Object.entries(currentRow)) {
      rowResult[key] = convertNode(key, value);
    }
    converted.push(rowResult);
  }
  return converted;
}

module.exports = {
  tables: [
    {
      TableName: "Clevo-Raw-Speech-Table",
      KeySchema: [{ AttributeName: "fileName", KeyType: "HASH" }],
      AttributeDefinitions: [
        { AttributeName: "fileName", AttributeType: "S" },
        { AttributeName: "organizationName", AttributeType: "S" },
        { AttributeName: "createdAt", AttributeType: "N" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "organizationName-createdAt-index",
          KeySchema: [
            { AttributeName: "organizationName", KeyType: "HASH" },
            { AttributeName: "createdAt", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
      ],
      BillingMode: "PAY_PER_REQUEST",
      data: convertRawSeeds(require("./test/local-dynamo/Clevo-Raw-Speech-Table.json")),
    },
    {
      TableName: "Clevo-Processed-Speech-Table",
      KeySchema: [{ AttributeName: "fileName", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "fileName", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST",
      data: convertRawSeeds(require("./test/local-dynamo/Clevo-Processed-Speech-Table.json")),
    },
    {
      TableName: "Clevo-Categorized-Sentence-Table",
      KeySchema: [
        { AttributeName: "categoryName", KeyType: "HASH" },
        { AttributeName: "fileNameBeginTime", KeyType: "RANGE" },
      ],
      AttributeDefinitions: [
        { AttributeName: "categoryName", AttributeType: "S" },
        { AttributeName: "fileNameBeginTime", AttributeType: "S" },
      ],
      BillingMode: "PAY_PER_REQUEST",
      data: convertRawSeeds(require("./test/local-dynamo/Clevo-Categorized-Sentence-Table.json")),
    },
  ],
  basePort: 8000,
};
