const TABLE_NAME = process.env.TABLE_NAME || "number-acidizer-table";
const PK_VALUE = process.env.PK_VALUE || "";
const MAX_VALUE = parseInt(process.env.MAX_VALUE || "1000000000", 10);
const MIN_VALUE = parseInt(process.env.MIN_VALUE || "0", 10);
const DELTA = parseInt(process.env.DELTA || "1", 10);
const AWS_REGION = process.env.AWS_REGION || "eu-north-1";
