import * as AWS from "aws-sdk";
import deleteItem from "./CRUD/delete";
import getItem from "./CRUD/get";
import createItem from "./CRUD/put";
import queryItems from "./CRUD/query";
import getAllItems from "./CRUD/scan";
import transactWrite from "./CRUD/transactWrite";
import updateItem from "./CRUD/update";
import { DeleteItemInput, GetItemInput, PutItemInput, QueryInput, ScanInput, UpdateItemInput } from "./types";

let dynamodb = new AWS.DynamoDB();
let docClient = new AWS.DynamoDB.DocumentClient();

interface IIndex {
  name: string;
  partitionKey: string;
  sortKey: string | undefined;
}

export class Table {
  public static transactWrite(transactions: any, options = { verbose: false }) {
    const { verbose } = options;
    delete options.verbose;
    return transactWrite({ docClient, transactions, options, verbose });
  }

  public static replaceDynamoClient(newDynamodb, newClient) {
    dynamodb = newDynamodb;
    docClient = newClient;
  }

  public tableName: string;
  public partitionKey: string | undefined;
  public sortKey: string | undefined;
  public indexMap: Map<string, IIndex>;
  private initialized: boolean;

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
      const { partitionKey: indexPartitionKey, sortKey: indexSortKey } = this.retrieveKeys(indexRecord.KeySchema);
      const index: IIndex = {
        name: "UsernameIndex",
        partitionKey: indexPartitionKey as string,
        sortKey: indexSortKey
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
    /**
     * Check if input key contains non-key fields
     */
    let noExtraField = true;
    for (const objKey of Object.keys(key)) {
      if (this.partitionKey !== objKey && this.sortKey !== objKey) {
        noExtraField = false;
      }
    }
    /**
     * Check if input key contains partitionKey
     */
    const containsPartitionKey = key[this.partitionKey] !== undefined;
    return noExtraField && containsPartitionKey;
  }

  public async get(key: object | string, options: GetItemInput = {}) {
    if (!this.initialized) {
      await this.initTable();
    }

    if (typeof key === "string") {
      key = this.parsePartitionKey(key);
    }

    if (!this.isValidKey(key)) {
      throw new Error(`Invalid Key: ${JSON.stringify(key)}`);
    }

    const { verbose, forTrx } = this.retrieveAndDeleteDLOptions(options);

    return getItem({ docClient, tableName: this.tableName, key, options, verbose, forTrx });
  }

  public async put(item: any, options: PutItemInput = {}) {
    if (!this.initialized) {
      await this.initTable();
    }
    const { verbose, forTrx, autoTimeStamp } = this.retrieveAndDeleteDLOptions(options);

    return createItem({ docClient, tableName: this.tableName, item, options, verbose, forTrx, autoTimeStamp });
  }

  public async delete(key: any, options: DeleteItemInput = {}) {
    if (!this.initialized) {
      await this.initTable();
    }

    if (typeof key === "string") {
      key = this.parsePartitionKey(key);
    }

    if (!this.isValidKey(key)) {
      throw new Error(`Invalid Key: ${JSON.stringify(key)}`);
    }

    const { verbose, forTrx } = this.retrieveAndDeleteDLOptions(options);

    return deleteItem({ docClient, tableName: this.tableName, key, options, verbose, forTrx });
  }

  public async update(key: any, newFields: any, options: UpdateItemInput = {}) {
    if (!this.initialized) {
      await this.initTable();
    }

    if (typeof key === "string") {
      key = this.parsePartitionKey(key);
    }

    if (!this.isValidKey(key)) {
      throw new Error(`Invalid Key: ${JSON.stringify(key)}`);
    }

    const { verbose, forTrx, autoTimeStamp } = this.retrieveAndDeleteDLOptions(options);

    return updateItem({
      docClient,
      key,
      tableName: this.tableName,
      newFields,
      options,
      verbose,
      forTrx,
      autoTimeStamp
    });
  }

  public async query(
    {
      indexName,
      partitionKeyValue,
      sortKeyOperator,
      sortKeyValue
    }: { indexName?: string; partitionKeyValue: string; sortKeyOperator?: string; sortKeyValue?: string },
    options: QueryInput = {}
  ) {
    if (!this.initialized) {
      await this.initTable();
    }

    let index;
    if (indexName) {
      index = this.indexMap.get(indexName);
      if (indexName && !index) {
        throw new Error(`Index ${indexName} doesn't belong to table ${this.tableName}`);
      }
    }

    const partitionKey = index ? index.partitionKey : this.partitionKey;
    let sortKey;
    if (sortKeyValue) {
      sortKey = index ? index.sortKey : this.sortKey;
    }

    const { verbose, pagination } = this.retrieveAndDeleteDLOptions(options);

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

  public async scan(param: any = {}, options: ScanInput = {}) {
    if (!this.initialized) {
      await this.initTable();
    }
    const { indexName, filters } = param;

    const { verbose, pagination } = this.retrieveAndDeleteDLOptions(options);

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

  private parsePartitionKey(partitionKeyValue: string): object {
    return {
      [this.partitionKey as string]: partitionKeyValue
    };
  }

  /**
   * Retrieve options specified by DL(dynamo-light), and remove them from the option param
   * @param options
   */
  private retrieveAndDeleteDLOptions(options) {
    const { verbose = false, forTrx = false, autoTimeStamp = false, pagination = true } = options;
    delete options.verbose;
    delete options.forTrx;
    delete options.autoTimeStamp;
    delete options.pagination;

    return {
      verbose,
      forTrx,
      autoTimeStamp,
      pagination
    };
  }
}
