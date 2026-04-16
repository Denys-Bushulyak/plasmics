import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  Context,
  APIGatewayProxyResult,
  APIGatewayProxyEvent,
} from "aws-lambda";
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

/**
 * Get current counter value
 */
async function getCurrentCounter(): Promise<CounterResponse> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: PK_VALUE },
      }),
    );

    if (!result.Item) {
      // If counter doesn't exist, initialize it
      return { value: 0 };
    }

    return {
      value: result.Item.value || 0,
    };
  } catch (error) {
    console.error("Error getting counter:", error);
    throw error;
  }
}

/**
 * Increment counter with ACID guarantees
 * Uses atomic UpdateItem with ADD operation to ensure exactly one increment per request
 */
async function incrementCounter(): Promise<CounterResponse> {
  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: PK_VALUE },
        UpdateExpression: "SET value = if_not_exists(value, :default) + :delta",
        ExpressionAttributeValues: {
          ":delta": DELTA,
          ":max": MAX_VALUE,
        },
        ReturnValues: "ALL_NEW",
        // Allow increment if attribute doesn't exist or value is less than max
        ConditionExpression: "value < :max",
      }),
    );

    const newValue = result.Attributes?.value || 0;

    return {
      value: newValue,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      // Counter has reached maximum value
      const current = await getCurrentCounter();
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
async function decrementCounter(): Promise<CounterResponse> {
  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: PK_VALUE },
        UpdateExpression: "SET value = if_not_exists(value, :default) - :dec ",
        ExpressionAttributeValues: {
          ":dec": DELTA,
          ":default": MIN_VALUE + 1,
          ":min": MIN_VALUE,
        },
        ReturnValues: "ALL_NEW",
        // Allow decrement if value exists and is greater than min
        ConditionExpression: "value > :min",
      }),
    );

    const newValue = result.Attributes?.value || 0;

    // Verify the update actually decremented (safety check)
    if (
      typeof newValue !== "number" ||
      newValue < MIN_VALUE ||
      newValue > MAX_VALUE
    ) {
      throw new Error(`Invalid counter value after decrement: ${newValue}`);
    }

    return {
      value: newValue,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      // Counter is already at minimum value
      const current = await getCurrentCounter();
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
    headers: corsHeaders,
  };
}

/**
 * Main Lambda handler
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);

  console.log(JSON.stringify(event, null, 2));

  const path = event.path.toLowerCase();
  const method = event.httpMethod.toUpperCase();

  try {
    // Handle OPTIONS requests for CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return createResponse(200, {});
    }

    // Route handling
    if (path.includes("/current") && method === "GET") {
      const counter = await getCurrentCounter();
      return createResponse(200, counter);
    }

    if (path.includes("/increment") && method === "POST") {
      const counter = await incrementCounter();
      return createResponse(200, counter);
    }

    if (path.includes("/decrement") && method === "POST") {
      const counter = await decrementCounter();
      return createResponse(200, counter);
    }

    // 404 Not Found
    return createResponse(404, {
      error: "NotFound",
      message: `Endpoint ${method} ${path} not found`,
    });
  } catch (error) {
    console.error("Unhandled error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return createResponse(500, {
      error: "InternalServerError",
      message: errorMessage,
    });
  }
};
