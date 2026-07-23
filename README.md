# fiscal

Your personal finance dashboard.

## App

```bash
npm install
npm run dev
```

- `/` — sample-data demo
- `/workspace` — upload your own statements (AWS when configured)

## AWS backend

See [infra/README.md](infra/README.md) for S3 + Lambda + API Gateway + DynamoDB deploy steps. After deploy, set `NEXT_PUBLIC_API_URL` in `.env.local`.
