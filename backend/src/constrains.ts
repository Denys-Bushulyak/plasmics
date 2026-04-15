const TABLE_NAME = process.env.TABLE_NAME || "number-acidizer-table";
const PK_VALUE = "counter";
const MAX_VALUE = 1_000_000_000;
const MIN_VALUE = 0;
const DELTA = 1;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
