# Fiscal AWS backend

Deploys **S3** (statement uploads), **Lambda** (presign / parse / list / clear), **API Gateway HTTP API**, and **DynamoDB** (normalized transactions).

## Prerequisites

1. An AWS account
2. [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) configured (`aws configure`)
3. Node 20+

```bash
# macOS
brew install awscli

aws configure   # access key, secret, region (e.g. us-west-2)
```

## Install & deploy

```bash
cd services/api && npm install && cd ../..
cd infra && npm install

# First time only
npx cdk bootstrap

# Deploy (prints ApiBaseUrl)
npm run deploy
```

Copy the `ApiBaseUrl` output into the app root:

```bash
# /.env.local
NEXT_PUBLIC_API_URL=https://xxxx.execute-api.us-west-2.amazonaws.com
```

Restart `npm run dev`, open `/workspace`, and upload a CSV. You should see a status line confirming **S3 → Lambda → DynamoDB**.

### CORS / production origin

Default allowed origins are local Next.js. For a deployed frontend:

```bash
cd infra
npx cdk deploy -c allowedOrigins=http://localhost:3000,https://your-app.vercel.app
```

## API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/uploads/presign` | `{ fileName }` → presigned S3 PUT URL |
| `POST` | `/uploads/process` | `{ key }` → parse CSV, write DynamoDB |
| `GET` | `/transactions` | List transactions for `demo` user |
| `DELETE` | `/transactions` | Clear that user’s transactions |

Optional header: `x-user-id` (defaults to `demo`).

## Tear down

```bash
cd infra && npm run destroy
```
