import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Documents table
  await knex.schema.createTable('documents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('language').notNullable();
    table.string('title').notNullable();
    table.string('s3_key').notNullable().unique();
    table.string('content_type').notNullable();
    table.bigInteger('size_bytes').notNullable();
    table.string('status').defaultTo('uploaded'); // uploaded, processing, processed, failed

    // RAG Processing
    table.integer('chunk_count').defaultTo(0);
    table.string('embedding_model');
    table.timestamp('processed_at');

    table.jsonb('metadata');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'language']);
    table.index(['status']);
    table.index(['created_at']);
  });

  // Document Chunks table
  await knex.schema.createTable('document_chunks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');
    table.integer('chunk_index').notNullable();
    table.text('content').notNullable();
    table.string('milvus_vector_id'); // Reference to vector in Milvus

    table.jsonb('metadata');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['document_id', 'chunk_index']);
    table.index(['document_id']);
    table.index(['milvus_vector_id']);
  });

  // Learning Goals table
  await knex.schema.createTable('learning_goals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('language').notNullable();
    table.string('goal_type').notNullable(); // daily, weekly, monthly, custom
    table.integer('target').notNullable();
    table.integer('current').defaultTo(0);
    table.string('unit').notNullable(); // minutes, words, conversations
    table.timestamp('deadline');
    table.boolean('completed').defaultTo(false);
    table.timestamp('completed_at');

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'language']);
    table.index(['goal_type', 'completed']);
    table.index(['deadline']);
  });

  // Achievements table
  await knex.schema.createTable('achievements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('code').notNullable().unique();
    table.string('name').notNullable();
    table.text('description').notNullable();
    table.string('category').notNullable(); // streak, vocabulary, conversation, speaking, etc.
    table.jsonb('requirement').notNullable();
    table.integer('xp_reward').defaultTo(0);
    table.string('icon_url');

    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['category']);
  });

  // User Achievements table
  await knex.schema.createTable('user_achievements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('achievement_id').notNullable().references('id').inTable('achievements').onDelete('CASCADE');
    table.timestamp('unlocked_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'achievement_id']);
    table.index(['user_id']);
    table.index(['achievement_id']);
  });

  // Study Notes table
  await knex.schema.createTable('study_notes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('language').notNullable();
    table.string('title').notNullable();
    table.text('content').notNullable();
    table.string('category'); // grammar, vocabulary, culture, etc.
    table.specificType('tags', 'text[]').defaultTo('{}'); // PostgreSQL array

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'language']);
    table.index(['category']);
    table.index(['created_at']);
  });

  // Voice Recordings table (for pronunciation practice)
  await knex.schema.createTable('voice_recordings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('session_id').references('id').inTable('study_sessions').onDelete('SET NULL');
    table.string('language').notNullable();
    table.string('s3_key').notNullable();
    table.text('transcript'); // From AWS Transcribe
    table.text('expected_text'); // What they should have said

    // Pronunciation analysis
    table.decimal('pronunciation_score', 4, 2);
    table.jsonb('pronunciation_details'); // Phoneme-level feedback
    table.jsonb('transcribe_metadata'); // Full AWS Transcribe response

    table.integer('duration_seconds');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'language']);
    table.index(['session_id']);
    table.index(['created_at']);
  });

  console.log('Created documents, achievements, notes, and voice recordings tables');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('voice_recordings');
  await knex.schema.dropTableIfExists('study_notes');
  await knex.schema.dropTableIfExists('user_achievements');
  await knex.schema.dropTableIfExists('achievements');
  await knex.schema.dropTableIfExists('learning_goals');
  await knex.schema.dropTableIfExists('document_chunks');
  await knex.schema.dropTableIfExists('documents');
}
