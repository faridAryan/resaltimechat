#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LearnoServerlessStack } from './learno-stack';

const app = new cdk.App();

new LearnoServerlessStack(app, 'LearnoServerlessStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Learno Language Learning Platform - Serverless Backend with LangChain v1',
  tags: {
    Project: 'Learno',
    Environment: 'Production',
    ManagedBy: 'AWS CDK',
  },
});

app.synth();
