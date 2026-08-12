export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "PayFlow API",
    version: "2.0.0",
    description: "PayFlow V2 — digital wallet, transactions, analytics, and AI APIs",
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths: {
    "/api/v1/user/signup": {
      post: {
        tags: ["Authentication"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["firstName", "lastName", "username", "password"],
                properties: {
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  username: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "User created" },
          "400": { description: "Invalid input" },
          "409": { description: "User already exists" },
        },
      },
    },
    "/api/v1/user/signin": {
      post: {
        tags: ["Authentication"],
        summary: "Sign in",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "password"],
                properties: {
                  username: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Signed in" },
          "400": { description: "Invalid credentials" },
        },
      },
    },
    "/api/v1/user/me": {
      get: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        summary: "Get current user",
        responses: {
          "200": { description: "Current user profile" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/user/bulk": {
      get: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        summary: "Search users",
        parameters: [
          { name: "filter", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "User list" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/account/balance": {
      get: {
        tags: ["Account"],
        security: [{ bearerAuth: [] }],
        summary: "Get balance",
        responses: {
          "200": { description: "Account balance" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/account/transfer": {
      post: {
        tags: ["Account"],
        security: [{ bearerAuth: [] }],
        summary: "Transfer money",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["to", "amount"],
                properties: {
                  to: { type: "string" },
                  amount: { type: "number" },
                  description: { type: "string" },
                  category: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Transfer successful" },
          "400": { description: "Insufficient balance or invalid request" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/transactions": {
      get: {
        tags: ["Transactions"],
        security: [{ bearerAuth: [] }],
        summary: "List transactions with filters",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "sort", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string" } },
          { name: "to", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Paginated transactions" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/analytics/overview": {
      get: {
        tags: ["Analytics"],
        security: [{ bearerAuth: [] }],
        summary: "Financial overview",
        responses: {
          "200": { description: "Analytics overview" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/ai/assistant": {
      post: {
        tags: ["AI"],
        security: [{ bearerAuth: [] }],
        summary: "Ask the finance assistant",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["question"],
                properties: {
                  question: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "AI answer" },
          "503": { description: "AI not configured" },
        },
      },
    },
    "/api/v1/ai/insights": {
      get: {
        tags: ["AI"],
        security: [{ bearerAuth: [] }],
        summary: "Spending insights",
        responses: {
          "200": { description: "Insight text" },
          "503": { description: "AI not configured" },
        },
      },
    },
    "/api/v1/ai/monthly-summary": {
      get: {
        tags: ["AI"],
        security: [{ bearerAuth: [] }],
        summary: "Monthly AI summary",
        responses: {
          "200": { description: "Monthly summary" },
          "503": { description: "AI not configured" },
        },
      },
    },
  },
};
