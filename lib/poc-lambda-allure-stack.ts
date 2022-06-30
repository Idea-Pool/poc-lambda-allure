import { Duration, RemovalPolicy, Size, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { join } from "path";

export class PocLambdaAllureStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'Storage', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: true,
      websiteIndexDocument: 'index.html',
    });

    const dockerFn = new lambda.DockerImageFunction(this, 'DockerTransformer', {
      code: lambda.DockerImageCode.fromImageAsset(join(__dirname, '..', 'lambda')),
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
      logRetention: RetentionDays.ONE_WEEK,
      timeout: Duration.seconds(30),
      memorySize: 512,
      ephemeralStorageSize: Size.mebibytes(512),
    });

    bucket.grantReadWrite(dockerFn);

    new CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
    });
    new CfnOutput(this, 'LambdaName', {
      value: dockerFn.functionName,
    });
  }
}
