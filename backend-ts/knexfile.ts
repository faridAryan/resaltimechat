import type { Knex } from 'knex';

// Update with your config settings.
const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'learno',
      user: process.env.DB_USER || 'learno_admin',
      password: process.env.DB_PASSWORD || 'password',
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
    },
  },

  production: {
    client: 'postgresql',
    connection: async () => {
      // For Aurora Serverless v2, use AWS Secrets Manager
      if (process.env.DB_SECRET_ARN) {
        const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
        const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
        const response = await client.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN }));
        const secret = JSON.parse(response.SecretString || '{}');

        return {
          host: process.env.DB_CLUSTER_ENDPOINT || secret.host,
          port: parseInt(secret.port || '5432'),
          database: process.env.DB_NAME || secret.dbname || 'learno',
          user: secret.username,
          password: secret.password,
          ssl: { rejectUnauthorized: false }, // Aurora requires SSL
        };
      }

      return {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'learno',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
      };
    },
    pool: {
      min: 2,
      max: 20,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 600000,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
      extension: 'ts',
    },
    acquireConnectionTimeout: 60000,
  },
};

export default config;
