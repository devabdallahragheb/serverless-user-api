# Production-Ready Lambda CRUD API with DynamoDB

A fully production-ready serverless CRUD API built with AWS Lambda and DynamoDB, featuring clean architecture, DTOs, validation, email uniqueness, pagination, and Query operations with GSIs.

## ✨ Features

- ✅ **Clean Architecture** - Repository → Service → Handler pattern
- ✅ **DTOs & Validation** - Zod schemas for input validation
- ✅ **Email Uniqueness** - Enforced via EmailIndex GSI  
- ✅ **Query Operations** - GSI1 (all users), GSI2 (by role) - **No expensive Scans!**
- ✅ **Pagination** - Token-based with configurable limit (1-100)
- ✅ **Filtering** - By role, name, email
- ✅ **Error Handling** - Custom error classes with proper HTTP codes
- ✅ **Structured Logging** - JSON logs with context tracking
- ✅ **CORS Support** - Ready for frontend integration
- ✅ **Local Testing** - SAM CLI + DynamoDB Local

## 📋 Prerequisites

- Node.js 20+
- Docker & Docker Compose
- AWS SAM CLI ([Install guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html))
- Terraform (for AWS deployment)
- jq (for test scripts)

## 🚀 Local Development & Testing

### Step 1: Start DynamoDB Local

From the project root:
```bash
docker compose up -d
```

This starts DynamoDB Local on port 8000.

### Step 2: Create DynamoDB Table

Use the existing Terraform setup:
```bash
cd ../terraform
terraform init
terraform apply -auto-approve
cd ../lambda
```

### Step 3: Install Dependencies

```bash
cd handlers
npm install
cd ..
```

### Step 4: Start SAM Local API

```bash
sam build
sam local start-api --docker-network dynmo-crud_default
```

The API will be available at `http://127.0.0.1:3000`

**Note**: The `--docker-network` flag connects SAM to the same network as DynamoDB Local.

### Step 5: Test the API

Open a new terminal and run:
```bash
chmod +x scripts/test-lambda-local.sh
./scripts/test-lambda-local.sh
```

Or test manually:

#### Create User
```bash
curl -X POST http://127.0.0.1:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Abdullah","email":"abdullah@test.com","role":"developer"}'
```

#### List Users
```bash
curl http://127.0.0.1:3000/users
```

#### Get User
```bash
curl http://127.0.0.1:3000/users/{user-id}
```

#### Update User
```bash
curl -X PATCH http://127.0.0.1:3000/users/{user-id} \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name","role":"senior developer"}'
```

#### Delete User
```bash
curl -X DELETE http://127.0.0.1:3000/users/{user-id}
```

## 🧪 Testing Individual Functions

You can invoke individual Lambda functions locally:

```bash
sam local invoke CreateUserFunction --event events/create-user.json
sam local invoke ListUsersFunction --event events/list-users.json
```

## ☁️ AWS Deployment

### Deploy with Terraform

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

This will create:
- DynamoDB table
- 5 Lambda functions
- IAM roles and policies
- API Gateway HTTP API
- All necessary integrations

After deployment, Terraform will output the API endpoint URL.

### Deploy with SAM (Alternative)

```bash
sam build
sam deploy --guided
```

Follow the prompts to configure:
- Stack name
- AWS Region
- Confirm changes before deploy
- Allow SAM CLI IAM role creation
- Save arguments to configuration file

## 📁 Project Structure

```
serverless-user-api/
├── handlers/                # Lambda function handlers
│   ├── create.js           # POST /users
│   ├── get.js              # GET /users/{id}
│   ├── list.js             # GET /users
│   ├── update.js           # PATCH /users/{id}
│   ├── delete.js           # DELETE /users/{id}
│   ├── package.json        # Dependencies
│   └── src/                # Shared code (clean architecture)
│       ├── config/         # DynamoDB client configuration
│       ├── constants/      # HTTP status, DynamoDB, error messages
│       ├── dto/            # Data Transfer Objects & Zod schemas
│       ├── errors/         # Custom error classes
│       ├── middleware/     # Error handler, Lambda wrapper
│       ├── repositories/   # Data access layer
│       ├── services/       # Business logic layer
│       └── utils/          # Logger, response builder, request parser
├── terraform/              # Infrastructure as Code
│   ├── main.tf            # Local DynamoDB setup
│   ├── aws-main.tf        # AWS deployment config
│   ├── variables.tf       # Variables
│   └── outputs.tf         # Outputs
├── events/                # Sample Lambda events for testing
├── scripts/               # Test scripts
├── template.yaml          # SAM template
├── package.json           # Project config
└── README.md              # This file
```

## 🗄️ DynamoDB Schema

**Table**: Users (Production-optimized with GSIs)

### Primary Key
- **PK** (Partition Key): `USER#{uuid}`
- **SK** (Sort Key): `PROFILE`

### Global Secondary Indexes

**1. EmailIndex** - Email uniqueness constraint
- Hash Key: `email`
- Purpose: Prevent duplicate emails (409 Conflict)

**2. GSI1** - List all users (Query, not Scan!)
- **GSI1PK**: `USER` (all users share this)
- **GSI1SK**: `createdAt` timestamp
- Purpose: Paginated user listing sorted by creation date

**3. GSI2** - Filter by role (Query, not Scan!)
- **GSI2PK**: `ROLE#DEVELOPER` (role-based partition)
- **GSI2SK**: `createdAt` timestamp  
- Purpose: Efficient role-based queries

### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | String | `USER#{uuid}` |
| SK | String | `PROFILE` |
| id | String | User UUID |
| name | String | User name (2-100 chars) |
| email | String | **Unique** email (validated & lowercase) |
| role | String | `user`, `developer`, `admin`, `senior developer` |
| createdAt | String | ISO timestamp |
| updatedAt | String | ISO timestamp |
| GSI1PK | String | `USER` |
| GSI1SK | String | Same as `createdAt` |
| GSI2PK | String | `ROLE#{ROLE}` |
| GSI2SK | String | Same as `createdAt` |

### Why GSIs Matter

❌ **Bad (Scan)**: Reads entire table, then filters → Expensive!
```javascript
// Scans 100,000 items to find 20 developers
ScanCommand({ FilterExpression: 'role = :role' })
// Cost: ~25,000 RCUs
```

✅ **Good (Query with GSI2)**: Reads only matching items
```javascript
// Queries only 20 developer items directly
QueryCommand({ 
  IndexName: 'GSI2',
  KeyConditionExpression: 'GSI2PK = :pk',
  ExpressionAttributeValues: { ':pk': 'ROLE#DEVELOPER' }
})
// Cost: ~5 RCUs (99.98% savings!)
```

## 🔧 Environment Variables

Lambda functions use these environment variables:

- `TABLE_NAME`: DynamoDB table name (set automatically)
- `AWS_REGION`: AWS region (set automatically)
- `DYNAMODB_ENDPOINT`: DynamoDB endpoint (local only)

## 📊 API Endpoints

### 1. Create User
**POST** `/users`

Validates input, checks email uniqueness, returns 409 if email exists.

```bash
curl -X POST http://127.0.0.1:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Abdullah",
    "email": "abdullah@test.com",
    "role": "developer"
  }'
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "1d134ca3-b5f3-4fb5-a567-4898c1a4e5c3",
    "name": "Abdullah",
    "email": "abdullah@test.com",
    "role": "developer",
    "createdAt": "2026-05-06T23:32:16.457Z",
    "updatedAt": "2026-05-06T23:32:16.457Z"
  }
}
```

**Validation:**
- `name`: 2-100 characters, required
- `email`: Valid email, unique, required
- `role`: `user` (default), `developer`, `admin`, `senior developer`

---

### 2. List Users (with Pagination & Filtering)
**GET** `/users?limit=20&role=developer&name=Abd`

Uses **Query on GSI1** (not Scan!) for efficient listing.

```bash
# Basic list
curl "http://127.0.0.1:3000/users"

# With pagination
curl "http://127.0.0.1:3000/users?limit=10"

# Filter by role (uses GSI2 Query!)
curl "http://127.0.0.1:3000/users?role=developer"

# Multiple filters
curl "http://127.0.0.1:3000/users?role=developer&limit=5&name=Abd"

# Next page
curl "http://127.0.0.1:3000/users?limit=10&nextToken=<token>"
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "count": 3,
    "scannedCount": 3,
    "hasMore": false,
    "nextToken": null
  }
}
```

**Query Parameters:**
- `limit`: 1-100 (default: 20)
- `role`: Filter by role (uses GSI2)
- `name`: Filter by name (contains)
- `email`: Filter by email (contains)
- `nextToken`: Pagination token from previous response

---

### 3. Get User by ID
**GET** `/users/{id}`

```bash
curl "http://127.0.0.1:3000/users/1d134ca3-b5f3-4fb5-a567-4898c1a4e5c3"
```

---

### 4. Update User
**PATCH** `/users/{id}`

Validates email uniqueness if changing email.

```bash
curl -X PATCH "http://127.0.0.1:3000/users/{id}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name", "role": "senior developer"}'
```

---

### 5. Delete User
**DELETE** `/users/{id}`

```bash
curl -X DELETE "http://127.0.0.1:3000/users/{id}"
```

---

### Error Responses

**400 Bad Request** - Validation error:
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [...]
  }
}
```

**404 Not Found** - User doesn't exist:
```json
{
  "success": false,
  "error": {
    "message": "User not found"
  }
}
```

**409 Conflict** - Email already exists:
```json
{
  "success": false,
  "error": {
    "message": "User with this email already exists"
  }
}
```

## 🐛 Troubleshooting

### SAM Local can't connect to DynamoDB

Make sure:
1. DynamoDB Local is running: `docker ps`
2. Using correct network: `--docker-network dynmo-crud_default`
3. Handler uses `DYNAMODB_ENDPOINT` environment variable

### Lambda function errors

Check logs:
```bash
sam logs -n CreateUserFunction --tail
```

### Dependencies not found

Install in handlers directory:
```bash
cd handlers
npm install
cd ..
sam build
```

## 🏛️ Clean Architecture

This project follows clean architecture principles with clear separation of concerns:

```
Handler (Thin)
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (Data Access)
    ↓
DynamoDB
```

### Layers Explained

**1. Handlers** (`handlers/*.js`)
- Thin entry points
- Parse requests, call services, return responses
- Wrapped with error handling middleware

**2. Services** (`handlers/src/services/*.js`)
- Business logic
- DTO validation
- Orchestrate repository calls

**3. Repositories** (`handlers/src/repositories/*.js`)
- Data access layer
- DynamoDB operations
- Query construction

**4. DTOs** (`handlers/src/dto/*.js`)
- Input/output validation with Zod
- Type safety
- Data transformation

**5. Utils** (`handlers/src/utils/*.js`)
- Response builder (consistent API responses)
- Logger (structured JSON logs)
- Request parser

---

## 🛠️ Tech Stack

- **Runtime**: Node.js 20 (ES Modules)
- **Validation**: Zod (runtime type checking)
- **AWS Services**: Lambda, DynamoDB, API Gateway
- **IaC**: Terraform + SAM
- **Testing**: SAM CLI Local, DynamoDB Local
- **CI/CD Ready**: GitHub Actions compatible

---

## 🔐 Security Notes

For production:
- Remove `DYNAMODB_ENDPOINT` environment variable
- Use IAM roles instead of access keys
- Enable API Gateway authentication (Cognito, IAM, or Lambda authorizer)
- Add request throttling and rate limiting
- Enable CloudWatch Logs encryption
- Use VPC for Lambda functions if needed
- Add WAF rules for API Gateway
- Enable X-Ray tracing

---

## 📚 Resources

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Lambda Node.js Runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)
- [Zod Documentation](https://zod.dev/)

---

## 📝 License

MIT

---

## 👤 Author

Built with best practices for production-ready serverless applications.
