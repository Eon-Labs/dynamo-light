/**
 * Get new Image from DynamoDB Stream event, and parse it into a flat object
 * @param {*} record Record from DyanmoDB stream event
 */
function parseNewImageFromRecord(record) {
  if (!record || !record.dynamodb || !record.dynamodb.NewImage) {
    console.log(`Record is malformed, ${JSON.stringify(record)}`);
    throw new Error("Record is malformed");
  }
  const item = {};
  Object.keys(record.dynamodb.NewImage).forEach(param => {
    if (!record.dynamodb.NewImage[param].N && !record.dynamodb.NewImage[param].S) {
      console.log(`record.dynamodb.NewImage[param], ${record.dynamodb.NewImage[param]}`);
      throw new Error("Record is malformed");
    }
    item[param] =
      record.dynamodb.NewImage[param].S || parseFloat(record.dynamodb.NewImage[param].N);
  });
  return item;
}

/**
 * Concat fetch results from query or scan operations - currently it concats Items only, TODO: concats other properties such as count
 */
function concatBatchFetchResult(prevResult, fetchedData) {
  if (!prevResult) {
    return fetchedData;
  }
  const result = prevResult;
  result.Items = prevResult.Items.concat(fetchedData.Items);
  result.Count += fetchedData.Count;
  result.ScannedCount += fetchedData.ScannedCount;
  result.LastEvaluatedKey = fetchedData.LastEvaluatedKey;
  return result;
}

/**
 * Get params for DynamoDB table update calls
 * */
function getUpdateExpression(newFields) {
  let UpdateExpression = "";
  /**
   * Separate null and non-null fields,
   * for null fields use REMOVE
   * for fields that starts with + use ADD
   * for other non-null fields use SET,
   */
  const nullFields = {};
  const addFields = {};
  const nonNullFields = {};
  Object.keys(newFields).forEach(field => {
    if (newFields[field] === null || newFields[field] === undefined) {
      nullFields[field] = null;
    } else if (field.startsWith("+")) {
      addFields[field.substr(1)] = newFields[field];
    } else {
      nonNullFields[field] = newFields[field];
    }
  });

  /**
   * Create UpdateExpression for non-null fields
   */
  if (Object.keys(nonNullFields).length > 0) {
    UpdateExpression += " SET";
    for (const fieldKey of Object.keys(nonNullFields)) {
      UpdateExpression += ` #${fieldKey} = :${fieldKey},`;
    }
    // Return UpdateExpression after trimming the last character
    UpdateExpression = UpdateExpression.slice(0, -1);
  }

  /**
   * Create UpdateExpression for non-null fields
   */
  if (Object.keys(nullFields).length > 0) {
    UpdateExpression += " REMOVE";
    for (const fieldKey of Object.keys(nullFields)) {
      UpdateExpression += ` #${fieldKey},`;
    }
    // Return UpdateExpression after trimming the last character
    UpdateExpression = UpdateExpression.slice(0, -1);
  }

  /**
   * Create UpdateExpression for add fields
   */
  if (Object.keys(addFields).length > 0) {
    UpdateExpression += " ADD";
    for (const fieldKey of Object.keys(addFields)) {
      UpdateExpression += ` #${fieldKey} :${fieldKey},`;
    }
    // Return UpdateExpression after trimming the last character
    UpdateExpression = UpdateExpression.slice(0, -1);
  }

  return UpdateExpression;
}

function removePlusFromFieldNames(rawNewFields) {
  const newFields = {};
  Object.keys(rawNewFields).forEach(field => {
    if (field.startsWith("+")) {
      newFields[field.substr(1)] = rawNewFields[field];
    } else {
      newFields[field] = rawNewFields[field];
    }
  });
  return newFields;
}

function getExpressionAttributeNames(rawNewFields) {
  const newFields = removePlusFromFieldNames(rawNewFields);
  const ExpressionAttributeNames = {};
  for (const fieldKey of Object.keys(newFields)) {
    ExpressionAttributeNames[`#${fieldKey}`] = fieldKey;
  }
  return ExpressionAttributeNames;
}

function getExpressionAttributeValues(rawNewFields, sortKeyOperator = undefined) {
  const newFields = removePlusFromFieldNames(rawNewFields);
  const ExpressionAttributeValues = {};
  const operatorIsBetween =
    typeof sortKeyOperator === "string" && sortKeyOperator.toLowerCase() === "between";
  let foundSortKey = false;

  for (const fieldKey of Object.keys(newFields)) {
    const value = newFields[fieldKey];
    if (Array.isArray(value) && value.length === 2 && operatorIsBetween) {
      /**
       * FieldKey is sortKey, and operator is between
       * Need to assign two values (from and two) for sortKey
       */
      ExpressionAttributeValues[`:${fieldKey}From`] = value[0];
      ExpressionAttributeValues[`:${fieldKey}To`] = value[1];
      foundSortKey = true;
    } else if (value !== null) {
      ExpressionAttributeValues[`:${fieldKey}`] = value;
    }
  }
  if (operatorIsBetween && !foundSortKey) {
    throw new Error(
      "sortKeyValue must be an array with 2 elements when sortKeyOperator is 'between'"
    );
  }
  return ExpressionAttributeValues;
}

function getKeyConditionExpression({ hashKey, sortKey, sortKeyOperator: rawSortKeyOperator }) {
  const hashKeyExpression = `#${hashKey} = :${hashKey}`;
  let sortKeyExpression;
  if (sortKey) {
    let sortKeyOperator = rawSortKeyOperator.toLowerCase();
    if (sortKeyOperator.includes("begin") && sortKeyOperator.includes("with")) {
      sortKeyOperator = "beginswith";
    }
    switch (sortKeyOperator) {
      case "=": {
        sortKeyExpression = `#${sortKey} = :${sortKey}`;
        break;
      }
      case "<": {
        sortKeyExpression = `#${sortKey} < :${sortKey}`;
        break;
      }
      case "<=": {
        sortKeyExpression = `#${sortKey} <= :${sortKey}`;
        break;
      }
      case ">": {
        sortKeyExpression = `#${sortKey} > :${sortKey}`;
        break;
      }
      case ">=": {
        sortKeyExpression = `#${sortKey} >= :${sortKey}`;
        break;
      }
      case "beginswith": {
        sortKeyExpression = `begins_with ( #${sortKey}, :${sortKey} )`;
        break;
      }
      case "between": {
        sortKeyExpression = `#${sortKey} BETWEEN :${sortKey}From AND :${sortKey}To`;
        break;
      }

      default: {
        sortKeyExpression = undefined;
        break;
      }
    }
  }
  return hashKeyExpression + (sortKeyExpression ? ` AND ${sortKeyExpression}` : "");
}

function buildKeyConditionExpressions({
  hashKey,
  hashKeyValue,
  sortKey,
  sortKeyOperator,
  sortKeyValue
}) {
  const keyValueObj = {};
  keyValueObj[hashKey] = hashKeyValue;
  if (sortKey) {
    keyValueObj[sortKey] = sortKeyValue;
  }
  const ExpressionAttributeNames = getExpressionAttributeNames(keyValueObj);
  const ExpressionAttributeValues = getExpressionAttributeValues(
    keyValueObj,
    sortKey ? sortKeyOperator : undefined
  );
  const KeyConditionExpression = getKeyConditionExpression({ hashKey, sortKey, sortKeyOperator });
  return {
    KeyConditionExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues
  };
}

/**
 * Combine Dynamodb Expressions
 * @param {string} exp1
 * @param {string} exp2
 */
function combineExpressions(exp1, exp2) {
  const validExps = [exp1, exp2].filter(exp => exp && exp.length > 0);
  return validExps.join(" AND ");
}

/**
 * Merge dynamodb options
 * Supports merging all dyanmodb expressions (filter, keyCondition, etc) and ExpressionAttributeNames, ExpressionAttributeValues,
 * For all the other params: opt2 will overwrite opt1
 */
function mergeOptions(opt1, opt2) {
  if (!opt1) return opt2;
  if (!opt2) return opt1;

  /**
   * Combine ExpressionAttributeNames and ExpressionAttributeValues
   */
  const combinedExpressionAttributeNames = {
    ...opt1.ExpressionAttributeNames,
    ...opt2.ExpressionAttributeNames
  };

  const combinedExpressionAttributeValues = {
    ...opt1.ExpressionAttributeValues,
    ...opt2.ExpressionAttributeValues
  };

  /**
   * Combine Expressions
   */
  function getAllExpressionNames(opt) {
    const keys = Object.keys(opt);
    return keys ? keys.filter(key => key.slice(-10) === "Expression") : [];
  }

  const expressionNameSet = new Set([
    ...getAllExpressionNames(opt1),
    ...getAllExpressionNames(opt2)
  ]);
  const expressionNames = Array.from(expressionNameSet);

  const combinedExpressions = {};
  expressionNames.forEach(expName => {
    combinedExpressions[expName] = combineExpressions(opt1[expName], opt2[expName]);
  });

  return {
    ...opt1,
    ...opt2,
    ...combinedExpressions,
    ...(combinedExpressionAttributeNames && {
      ExpressionAttributeNames: combinedExpressionAttributeNames
    }),
    ...(combinedExpressionAttributeValues && {
      ExpressionAttributeValues: combinedExpressionAttributeValues
    })
  };
}

/**
 * Prepare args to be ready for inserting into DynamoDB
 * */
function removeInvalidArgs(args) {
  const newArgs = [...args];
  for (const key of Object.keys(args)) {
    const isEmptyString = typeof args[key] === "string" && args[key].length === 0;
    const isNull = args[key] === null;
    if (isNull || isEmptyString) {
      newArgs[key] = undefined;
    }
  }
  return newArgs;
}

module.exports = {
  parseNewImageFromRecord,
  getUpdateExpression,
  getExpressionAttributeNames,
  getExpressionAttributeValues,
  removeInvalidArgs,
  buildKeyConditionExpressions,
  mergeOptions,
  concatBatchFetchResult
};
