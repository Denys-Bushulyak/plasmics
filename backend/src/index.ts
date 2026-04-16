import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyResult, APIGatewayProxyEventV2 } from "aws-lambda";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.TABLE_NAME || "number-acidizer-table";
const PK_VALUE = process.env.PK_VALUE || "";
const MAX_VALUE = parseInt(process.env.MAX_VALUE || "1000000000", 10);
const MIN_VALUE = parseInt(process.env.MIN_VALUE || "0", 10);
const DELTA = parseInt(process.env.DELTA || "1", 10);
const AWS_REGION = process.env.REGION || "eu-north-1";

const client = new DynamoDBClient({
  region: AWS_REGION,
});
const docClient = DynamoDBDocumentClient.from(client);

interface ApiResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}

interface CounterResponse {
  value: number;
}

interface ErrorResponse {
  error: string;
  message: string;
}

/**
 * Get current counter value
 */
async function getCurrentCounterValue(): Promise<CounterResponse> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: PK_VALUE },
      }),
    );

    if (!result.Item) {
      return { value: 0 };
    } else {
      return { value: result.Item.counter };
    }
  } catch (error) {
    console.error("Error getting counter:", error);
    throw error;
  }
}

/**
 * Increment counter with ACID guarantees
 * Uses atomic UpdateItem with ADD operation to ensure exactly one increment per request
 */
async function incrementCounterValue(): Promise<CounterResponse> {
  try {
    // get value before increment
    const current = await getCurrentCounterValue();
    const oldValue = current.value;
    const newValue = current.value + DELTA;

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: PK_VALUE },
        UpdateExpression: "SET #c = :newValue",
        ExpressionAttributeNames: {
          "#c": "counter",
        },
        ExpressionAttributeValues: {
          ":newValue": newValue,
          ":oldValue": oldValue,
          ":max": MAX_VALUE,
        },
        ConditionExpression: "#c < :max AND #c = :oldValue",
      }),
    );

    return {
      value: newValue,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      // Counter has reached maximum value
      const current = await getCurrentCounterValue();
      console.warn("Increment failed: counter at maximum value", current.value);
      return current;
    }
    console.error("Error incrementing counter:", error);
    throw error;
  }
}

/**
 * Decrement counter with ACID guarantees
 * Uses atomic UpdateItem with ADD operation (negative value) to ensure exactly one decrement per request
 */
async function decrementCounterValue(): Promise<CounterResponse> {
  try {
    const current = await getCurrentCounterValue();
    const oldValue = current.value;
    const newValue = oldValue - DELTA;

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: PK_VALUE },
        UpdateExpression: "SET #c = :newValue",
        ExpressionAttributeNames: {
          "#c": "counter",
        },
        ExpressionAttributeValues: {
          ":newValue": newValue,
          ":oldValue": oldValue,
          ":min": MIN_VALUE,
        },
        ConditionExpression: "#c > :min AND #c = :oldValue",
      }),
    );

    return {
      value: newValue,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      // Counter is already at minimum value
      const current = await getCurrentCounterValue();
      console.warn("Decrement failed: counter at minimum value", current.value);
      return current;
    }
    console.error("Error decrementing counter:", error);
    throw error;
  }
}

/**
 * Format API response
 */
function createResponse(
  statusCode: number,
  body: CounterResponse | ErrorResponse,
): ApiResponse {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {},
  };
}

/**
 * Main Lambda handler
 */
export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);

  switch (event.routeKey) {
    case "GET /current":
      return createResponse(200, await getCurrentCounterValue());
    case "POST /increment":
      return createResponse(200, await incrementCounterValue());
    case "POST /decrement":
      return createResponse(200, await decrementCounterValue());
    default:
      return createResponse(404, {
        error: "NotFound",
        message: `Endpoint ${event.requestContext.http.method} ${event.requestContext.http.path} not found`,
      });
  }
};
