import type { IDLArgumentsBase } from "../types";
import type { DocumentClient } from "aws-sdk/clients/dynamodb";

import * as api from "../utils/helper";

interface IDLUpdateOptions extends DocumentClient.UpdateItemInput {
  createIfNotExist?: boolean;
}

interface IDLUpdate extends IDLArgumentsBase<IDLUpdateOptions> {
  key: any;
  newFields: any;
  forTrx?: boolean;
  autoTimeStamp?: boolean;
}

/**
 * Update item in table
 */
export default async function update({
  docClient,
  tableName,
  key,
  newFields: rawNewFields,
  options = {},
  verbose = false,
  forTrx = false,
  autoTimeStamp = false,
}: IDLUpdate) {
  let params;
  try {
    const { ReturnValues = "ALL_NEW", createIfNotExist = false } = options;
    // Check for argument errors
    if (!key || typeof key !== "object" || Object.keys(key).length === 0) {
      console.error(`The key you gave was ${key}, which is invalid`);
      throw new Error("Update fail: argument `key` is invalid");
    }
    if (!rawNewFields || typeof rawNewFields !== "object" || Object.keys(rawNewFields).length === 0) {
      console.error(`invalid newFields`, rawNewFields);
      throw new Error("Update fail: newFields is invalid");
    }

    // Get update parameters
    const newFields = { ...rawNewFields };
    if (autoTimeStamp) {
      newFields.updatedAt = Date.now();
    }
    const UpdateExpression = api.getUpdateExpression(newFields);
    const attributesUsedInExpression = createIfNotExist ? newFields : { ...newFields, ...key };

    const ExpressionAttributeNames = api.getExpressionAttributeNames(attributesUsedInExpression);
    const ExpressionAttributeValues = api.getExpressionAttributeValues(attributesUsedInExpression);

    const dbKeyNames = Object.keys(key);
    const ConditionExpression = dbKeyNames.map((name) => `#${name} = :${name}`).join(" AND ");

    params = api.mergeOptions(
      {
        TableName: tableName,
        Key: key,
        UpdateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        ...(!createIfNotExist && { ConditionExpression }),
        ReturnValues,
      },
      options
    );
    if (verbose) {
      console.log("params", params);
    }

    /**
     * Return params for this requirement, used for transact method
     */
    if (forTrx) {
      return {
        Update: params,
      };
    }

    const data = await docClient.update(params).promise();
    if (verbose) {
      console.log(`Successfully updated item from table ${tableName}`, data);
    }
    return data;
  } catch (err) {
    if (verbose) {
      console.error(
        `Unable to update in table ${tableName} for the following fields: ${JSON.stringify(rawNewFields)}`,
        JSON.stringify(err),
        (err as any).stack
      );
      console.log("Error request params: ", JSON.stringify(params));
    }
    throw err;
  }
}
