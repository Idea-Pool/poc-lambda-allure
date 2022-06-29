 import * as cdk from 'aws-cdk-lib';
 import { Template } from 'aws-cdk-lib/assertions';
 import * as PocLambdaAllure from '../lib/poc-lambda-allure-stack';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/poc-lambda-allure-stack.ts
test('NodeJSFunction', () => {
   const app = new cdk.App();
//     // WHEN
   const stack = new PocLambdaAllure.PocLambdaAllureStack(app, 'MyTestStack');
//     // THEN
   const template = Template.fromStack(stack);

   template.templateMatches({ Resources: {}});

//   template.hasResourceProperties('AWS::SQS::Queue', {
//     VisibilityTimeout: 300
//   });
});
