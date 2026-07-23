#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { FiscalStack } from "../lib/fiscal-stack";

const app = new cdk.App();

new FiscalStack(app, "FiscalStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-west-2",
  },
  description: "Fiscal statement ingestion API (S3, Lambda, API Gateway, DynamoDB)",
});
