import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Conversations table
  await knex.schema.createTable('conversations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('session_id').notNullable().references('id').inTable('study_sessions').onDelete('CASCADE');
    table.string('language').notNullable();
    table.string('topic');
    table.string('difficulty').notNullable();
    table.integer('message_count').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'language']);
    table.index(['session_id']);
    table.index(['created_at']);
  });

  // Conversation Messages table
  await knex.schema.createTable('conversation_messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    table.string('role').notNullable(); // user, assistant, system
    table.text('content').notNullable();
    table.string('content_language');

    // AI Analysis
    table.jsonb('corrections');
    table.text('feedback');
    table.jsonb('vocabulary');
    table.string('sentiment');

    // Voice interaction metadata
    table.decimal('pronunciation_score', 4, 2);
    table.jsonb('pronunciation_feedback');
    table.string('audio_s3_key'); // For storing voice recordings

    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['conversation_id']);
    table.index(['role']);
    table.index(['created_at']);
  });

  // Memory Patterns table (Long-term RL memory)
  await knex.schema.createTable('memory_patterns', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('language').notNullable();
    table.string('pattern_type').notNullable(); // error_patterns, topic_preferences, learning_style, pronunciation_errors
    table.jsonb('pattern_data').notNullable();
    table.decimal('confidence', 3, 2).defaultTo(0.5);
    table.integer('occurrence_count').defaultTo(1);
    table.timestamp('last_observed_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'language', 'pattern_type']);
    table.index(['pattern_type']);
  });

  // Q-Learning Values table (RL Curriculum Adaptation)
  await knex.schema.createTable('q_values', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('language').notNullable();
    table.string('state_key').notNullable(); // Encoded state (level, topic, recent_performance)
    table.string('action_key').notNullable(); // Encoded action (next_topic, difficulty, content_type)
    table.decimal('q_value', 10, 6).defaultTo(0.0);
    table.integer('visit_count').defaultTo(0);
    table.timestamp('last_updated_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'language', 'state_key', 'action_key']);
    table.index(['user_id', 'language']);
    table.index(['state_key']);
  });

  // RL Curriculum State table (Adaptive Curriculum Learning - inspired by AdaCuRL)
  await knex.schema.createTable('curriculum_states', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('language').notNullable();

    // Current capability assessment
    table.decimal('estimated_proficiency', 3, 2).defaultTo(0.0); // 0-1 scale
    table.string('current_difficulty_band').defaultTo('beginner'); // beginner, intermediate, advanced
    table.jsonb('topic_mastery_scores'); // {grammar: 0.7, vocabulary: 0.5, ...}

    // Adaptive scheduling
    table.string('recommended_next_topic');
    table.string('recommended_difficulty');
    table.string('recommended_content_type'); // conversation, reading, listening, speaking
    table.decimal('curriculum_progress', 3, 2).defaultTo(0.0);

    // Performance tracking
    table.decimal('recent_accuracy', 3, 2); // Last 10 exercises
    table.integer('consecutive_successes').defaultTo(0);
    table.integer('consecutive_failures').defaultTo(0);
    table.timestamp('last_assessment_at');

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'language']);
    table.index(['user_id']);
  });

  console.log('Created conversations, messages, RL memory, and curriculum tables');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('curriculum_states');
  await knex.schema.dropTableIfExists('q_values');
  await knex.schema.dropTableIfExists('memory_patterns');
  await knex.schema.dropTableIfExists('conversation_messages');
  await knex.schema.dropTableIfExists('conversations');
}
