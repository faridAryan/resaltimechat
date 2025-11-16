import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Users table
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('cognito_sub').notNullable().unique();
    table.string('username').notNullable().unique();
    table.string('email').notNullable().unique();
    table.string('first_name');
    table.string('last_name');
    table.string('preferred_language');
    table.string('timezone').defaultTo('UTC');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('last_login_at');

    table.index(['email']);
    table.index(['username']);
    table.index(['cognito_sub']);
  });

  // User Progress table
  await knex.schema.createTable('user_progress', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('language').notNullable();
    table.string('current_level').defaultTo('beginner');
    table.integer('total_xp').defaultTo(0);
    table.integer('streak').defaultTo(0);
    table.integer('longest_streak').defaultTo(0);
    table.timestamp('last_practice_at');
    table.integer('total_minutes').defaultTo(0);
    table.integer('words_learned').defaultTo(0);
    table.integer('conversation_count').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'language']);
    table.index(['user_id']);
    table.index(['language']);
    table.index(['last_practice_at']);
  });

  // Study Sessions table
  await knex.schema.createTable('study_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('language').notNullable();
    table.string('session_type').notNullable(); // conversation, vocabulary, reading, grammar, speaking
    table.string('difficulty').notNullable();
    table.integer('duration_minutes').defaultTo(0);
    table.integer('xp_earned').defaultTo(0);
    table.boolean('completed').defaultTo(false);
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('ended_at');
    table.jsonb('metadata');

    table.index(['user_id', 'language']);
    table.index(['user_id', 'started_at']);
    table.index(['session_type']);
  });

  console.log('Created users, user_progress, and study_sessions tables');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('study_sessions');
  await knex.schema.dropTableIfExists('user_progress');
  await knex.schema.dropTableIfExists('users');
}
