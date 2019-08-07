import * as AWS from "aws-sdk";
import deleteItem from "./CRUD/delete";
import getItem from "./CRUD/get";
import createItem from "./CRUD/put";
import queryItems from "./CRUD/query";
import getAllItems from "./CRUD/scan";
import transactWrite from "./CRUD/transactWrite";
import updateItem from "./CRUD/update";
import "./utils/env";

const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

interface IIndex {
  name: string;
  partitionKey: string;
  sortKey: string | undefined;
}

export default class Table {
  public static transactWrite(transactions: any, options = {}, libOptions = { verbose: false, conditions: {} }) {
    const { verbose, conditions } = libOptions;
    return transactWrite({ docClient, transactions, options, verbose });
  }

  private tableName: string;
  private initialized: boolean;
  private partitionKey: string | undefined;
  private sortKey: string | undefined;
  private indexMap: Map<string, IIndex>;

  constructor(name: string) {
    this.tableName = name;
    this.initialized = false;
    this.partitionKey = undefined;
    this.sortKey = undefined;
    this.indexMap = new Map();
  }

  public async initTable() {
    const tableInfo: any = await dynamodb.describeTable({ TableName: this.tableName }).promise();
    this.initialized = true;
    /**
     * Set partitionKey and sortKey
     */
    const { KeySchema, GlobalSecondaryIndexes = [] } = tableInfo.Table;
    const { partitionKey, sortKey } = this.retrieveKeys(KeySchema);
    this.partitionKey = partitionKey;
    this.sortKey = sortKey;

    /**
     * Set indexes
     */
    for (const indexRecord of GlobalSecondaryIndexes) {
      const { partitionKey, sortKey } = this.retrieveKeys(indexRecord.KeySchema);
      //   index.partitionKey = partitionKey;
      //   index.sortKey = sortKey;
      const index: IIndex = {
        name: "UsernameIndex",
        partitionKey: partitionKey as string,
        sortKey
      };
      this.indexMap.set(indexRecord.IndexName, index);
    }
  }

  /**
   * Check if the key is valid for this table
   * @param {} key
   */
  public isValidKey(key: any) {
    if (!this.partitionKey) {
      return false;
    }
    return key[this.partitionKey] !== undefined;
  }

  public async get(key: any, options: any = {}, libOptions = { verbose: false, forTrx: false }) {
    if (!this.initialized) {
      await this.initTable();
    }
    if (!this.isValidKey(key)) {
      throw new Error(`key is invalid`);
    }

    const { verbose, forTrx } = libOptions;
    return getItem({ docClient, tableName: this.tableName, key, options, verbose, forTrx });
  }

  public async put(item: any, options: any = {}, libOptions = { verbose: false, forTrx: false }) {
    if (!this.initialized) {
      await this.initTable();
    }
    const { verbose, forTrx } = libOptions;
    return createItem({ docClient, tableName: this.tableName, item, options, verbose, forTrx });
  }

  public async delete(key: any, options: any = {}, libOptions = { verbose: false, forTrx: false }) {
    if (!this.initialized) {
      await this.initTable();
    }
    if (!this.isValidKey(key)) {
      throw new Error(`Key param contains invalid keyName`);
    }
    const { verbose, forTrx } = libOptions;
    return deleteItem({ docClient, tableName: this.tableName, key, options, verbose, forTrx });
  }

  public async update(key: any, newFields: any, options: any = {}, libOptions = { verbose: false, forTrx: false }) {
    if (!this.initialized) {
      await this.initTable();
    }

    if (!this.isValidKey(key)) {
      throw new Error(`Key param contains invalid keyName`);
    }
    const { verbose, forTrx } = libOptions;
    return updateItem({
      docClient,
      tableName: this.tableName,
      key,
      newFields,
      options,
      verbose,
      forTrx
    });
  }

  public async query(
    {
      indexName,
      partitionKeyValue,
      sortKeyOperator,
      sortKeyValue
    }: { indexName: string; partitionKeyValue: string; sortKeyOperator: string; sortKeyValue: string },
    options: any = {},
    libOptions = { verbose: false, pagination: true }
  ) {
    if (!this.initialized) {
      await this.initTable();
    }

    const index = this.indexMap.get(indexName);
    if (indexName && !index) {
      throw new Error(`Index ${indexName} doesn't belong to table ${this.tableName}`);
    }

    const partitionKey = index ? index.partitionKey : this.partitionKey;
    let sortKey;
    if (sortKeyValue) {
      sortKey = index ? index.sortKey : this.sortKey;
    }

    const { verbose, pagination } = libOptions;
    return queryItems({
      docClient,
      tableName: this.tableName,
      indexName,
      partitionKey,
      partitionKeyValue,
      sortKey,
      sortKeyOperator,
      sortKeyValue,
      options,
      pagination,
      verbose
    });
  }

  public async scan(param: any = {}, options: any = {}, libOptions: any = { verbose: false, pagination: true }) {
    if (!this.initialized) {
      await this.initTable();
    }
    const { indexName } = param;
    const { verbose, pagination } = libOptions;
    return getAllItems({
      docClient,
      tableName: this.tableName,
      indexName,
      options,
      pagination,
      verbose
    });
  }

  private retrieveKeys(KeySchema: any) {
    let partitionKey: string | undefined;
    let sortKey: string | undefined;
    for (const { AttributeName, KeyType } of KeySchema) {
      if (KeyType === "HASH") {
        partitionKey = AttributeName;
      }
      if (KeyType === "RANGE") {
        sortKey = AttributeName;
      }
    }
    return { partitionKey, sortKey };
  }
}
