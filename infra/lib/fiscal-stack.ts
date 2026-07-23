import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

const API_DIR = path.join(__dirname, "../../services/api");

export class FiscalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const allowedOrigins = (
      this.node.tryGetContext("allowedOrigins") as string | undefined
    )
      ?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ];

    const bucket = new s3.Bucket(this, "StatementsBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.PUT,
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins,
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag"],
          maxAge: 3000,
        },
      ],
    });

    const table = new dynamodb.Table(this, "TransactionsTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const sharedEnv = {
      BUCKET_NAME: bucket.bucketName,
      TABLE_NAME: table.tableName,
      DEFAULT_USER_ID: "demo",
    };

    const makeFn = (idName: string, entry: string): NodejsFunction =>
      new NodejsFunction(this, idName, {
        runtime: lambda.Runtime.NODEJS_24_X,
        entry: path.join(API_DIR, entry),
        handler: "handler",
        memorySize: 512,
        timeout: cdk.Duration.seconds(30),
        environment: sharedEnv,
        depsLockFilePath: path.join(API_DIR, "package-lock.json"),
        projectRoot: API_DIR,
        bundling: {
          minify: true,
          sourceMap: true,
          target: "node20",
          // Node 20 Lambda runtime does not include AWS SDK — bundle it.
          externalModules: [],
        },
      });

    const presignFn = makeFn("PresignFn", "src/handlers/presign.ts");
    const processFn = makeFn("ProcessUploadFn", "src/handlers/processUpload.ts");
    const listFn = makeFn("ListTransactionsFn", "src/handlers/listTransactions.ts");
    const clearFn = makeFn(
      "ClearTransactionsFn",
      "src/handlers/clearTransactions.ts",
    );

    bucket.grantPut(presignFn);
    bucket.grantRead(processFn);
    table.grantReadWriteData(processFn);
    table.grantReadData(listFn);
    table.grantReadWriteData(clearFn);

    const httpApi = new apigwv2.HttpApi(this, "FiscalHttpApi", {
      apiName: "fiscal-api",
      description: "Fiscal workspace API",
      corsPreflight: {
        allowHeaders: ["content-type", "x-user-id"],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: allowedOrigins,
        maxAge: cdk.Duration.days(1),
      },
    });

    httpApi.addRoutes({
      path: "/uploads/presign",
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration("PresignIntegration", presignFn),
    });

    httpApi.addRoutes({
      path: "/uploads/process",
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration("ProcessIntegration", processFn),
    });

    httpApi.addRoutes({
      path: "/transactions",
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration("ListIntegration", listFn),
    });

    httpApi.addRoutes({
      path: "/transactions",
      methods: [apigwv2.HttpMethod.DELETE],
      integration: new HttpLambdaIntegration("ClearIntegration", clearFn),
    });

    new cdk.CfnOutput(this, "ApiBaseUrl", {
      value: httpApi.apiEndpoint,
      description: "Set NEXT_PUBLIC_API_URL to this value",
    });

    new cdk.CfnOutput(this, "StatementsBucketName", {
      value: bucket.bucketName,
    });

    new cdk.CfnOutput(this, "TransactionsTableName", {
      value: table.tableName,
    });
  }
}
