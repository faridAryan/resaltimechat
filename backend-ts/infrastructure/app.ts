#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LearnoEnhancedStack } from './learno-enhanced-stack';
import { LearnoServerlessStack } from './learno-stack';

const app = new cdk.App();

// Use the enhanced stack with RDS PostgreSQL, Milvus, Cognito, Redis
new LearnoEnhancedStack(app, 'LearnoEnhancedStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Learno Enhanced - Aurora Serverless v2, Milvus, Cognito, Redis, LangChain v1',
  tags: {
    Project: 'Learno',
    Environment: 'Production',
    ManagedBy: 'AWS CDK',
    Version: '4.0',
  },
});

// Keep the original simple stack for reference (commented out)
// Uncomment to deploy the simpler DynamoDB-only version
// new LearnoServerlessStack(app, 'LearnoServerlessStack', {
//   env: {
//     account: process.env.CDK_DEFAULT_ACCOUNT,
//     region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
//   },
//   description: 'Learno Language Learning Platform - Serverless Backend with LangChain v1',
//   tags: {
//     Project: 'Learno',
//     Environment: 'Production',
//     ManagedBy: 'AWS CDK',
//   },
// });

app.synth();
