import { Knex } from 'knex';

/**
 * Migration: Create Real-Time Dialogue Practice Tables
 *
 * Tables:
 * 1. real_time_dialogue_sessions - Main session tracking
 * 2. dialogue_turns - Individual conversation turns
 * 3. dialogue_analytics - Detailed analytics per session
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Real-time dialogue sessions
  await knex.schema.createTable('real_time_dialogue_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('language', 50).notNullable();
    table
      .string('mode', 50)
      .notNullable()
      .comment(
        'Practice mode: free_conversation, guided_topic, pronunciation_drill, debate, storytelling'
      );
    table.string('topic', 255);
    table.string('difficulty', 20).notNullable().defaultTo('intermediate');
    table.integer('target_duration').comment('Target duration in minutes');
    table.jsonb('focus_areas').comment('Array of focus areas: pronunciation, grammar, etc.');
    table.boolean('enable_interruptions').defaultTo(true);
    table.boolean('real_time_transcription').defaultTo(true);

    // Session lifecycle
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('ended_at');
    table
      .string('status', 20)
      .notNullable()
      .defaultTo('active')
      .comment('active, paused, completed, abandoned');

    // Session metrics
    table.integer('total_turns').defaultTo(0);
    table.integer('user_turns').defaultTo(0);
    table.integer('ai_turns').defaultTo(0);
    table.decimal('avg_pronunciation_score', 5, 2);
    table.decimal('avg_fluency_score', 5, 2);
    table.integer('vocabulary_count').defaultTo(0);
    table.integer('grammar_issues').defaultTo(0);

    // Results
    table.jsonb('achievements').comment('Array of earned achievements');
    table.jsonb('feedback').comment('Comprehensive session feedback');

    table.timestamps(true, true);

    // Indexes
    table.index(['user_id', 'started_at']);
    table.index(['language', 'mode']);
    table.index('status');
  });

  // 2. Dialogue turns (individual exchanges)
  await knex.schema.createTable('dialogue_turns', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('session_id')
      .notNullable()
      .references('id')
      .inTable('real_time_dialogue_sessions')
      .onDelete('CASCADE');
    table.string('speaker', 10).notNullable().comment('user or ai');
    table.text('transcript').notNullable();
    table.string('audio_url', 500).comment('S3 URL if audio is stored');

    // User turn analysis (null for AI turns)
    table.decimal('pronunciation_score', 5, 2);
    table.decimal('fluency_score', 5, 2);
    table.decimal('accuracy_score', 5, 2);
    table.jsonb('grammar_corrections').comment('Array of grammar corrections');
    table.jsonb('vocabulary_used').comment('Array of vocabulary words used');
    table.jsonb('pronunciation_feedback').comment('Detailed pronunciation analysis');

    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
    table.timestamps(true, true);

    // Indexes
    table.index(['session_id', 'timestamp']);
    table.index('speaker');
  });

  // 3. Dialogue analytics (aggregated metrics)
  await knex.schema.createTable('dialogue_analytics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('session_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('real_time_dialogue_sessions')
      .onDelete('CASCADE');

    // Conversation quality metrics
    table.decimal('conversation_flow', 5, 2).comment('0-100 score of conversation quality');
    table.decimal('naturalness', 5, 2).comment('0-100 score of naturalness');
    table.decimal('engagement', 5, 2).comment('0-100 score of user engagement');

    // Content analysis
    table.jsonb('topics_discussed').comment('Array of topics covered');
    table.jsonb('vocabulary_breakdown').comment('Categorized vocabulary used');
    table.jsonb('grammar_patterns').comment('Grammar structures used');

    // Pronunciation details
    table.jsonb('prosody_scores').comment('Intonation, rhythm, stress scores');
    table.jsonb('word_level_scores').comment('Per-word pronunciation scores');

    // Progress indicators
    table.jsonb('strengths').comment('Array of identified strengths');
    table.jsonb('improvements_needed').comment('Array of areas to improve');
    table.jsonb('next_recommended_topics').comment('AI-suggested next topics');

    table.timestamps(true, true);
  });

  // 4. User dialogue preferences
  await knex.schema.createTable('dialogue_preferences', (table) => {
    table
      .uuid('user_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .string('preferred_mode', 50)
      .defaultTo('free_conversation')
      .comment('Preferred practice mode');
    table.jsonb('favorite_topics').comment('Array of favorite discussion topics');
    table.jsonb('avoided_topics').comment('Array of topics to avoid');
    table.boolean('enable_real_time_corrections').defaultTo(true);
    table.boolean('enable_interruptions').defaultTo(true);
    table.integer('preferred_session_duration').defaultTo(15).comment('Minutes');
    table
      .string('correction_style', 20)
      .defaultTo('gentle')
      .comment('gentle, moderate, strict');
    table.jsonb('focus_areas').comment('Priority areas: pronunciation, grammar, vocabulary');

    table.timestamps(true, true);
  });

  // 5. Dialogue achievements
  await knex.schema.createTable('dialogue_achievements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('achievement_type', 50).notNullable();
    table.string('language', 50).notNullable();
    table.string('achievement_name', 100).notNullable();
    table.text('description');
    table.timestamp('earned_at').notNullable().defaultTo(knex.fn.now());
    table
      .uuid('session_id')
      .references('id')
      .inTable('real_time_dialogue_sessions')
      .onDelete('SET NULL');

    table.timestamps(true, true);

    // Indexes
    table.index(['user_id', 'language']);
    table.index('achievement_type');
    table.unique(['user_id', 'achievement_type', 'language']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dialogue_achievements');
  await knex.schema.dropTableIfExists('dialogue_preferences');
  await knex.schema.dropTableIfExists('dialogue_analytics');
  await knex.schema.dropTableIfExists('dialogue_turns');
  await knex.schema.dropTableIfExists('real_time_dialogue_sessions');
}
