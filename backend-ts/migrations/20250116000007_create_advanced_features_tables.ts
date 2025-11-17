import { Knex } from 'knex';

/**
 * Migration: Create Advanced Features Tables
 *
 * Tables for:
 * 1. Spaced Repetition Vocabulary System
 * 2. Progress Analytics
 * 3. Writing Practice & Correction
 */
export async function up(knex: Knex): Promise<void> {
  // ==================== VOCABULARY SYSTEM ====================

  // 1. Vocabulary decks
  await knex.schema.createTable('vocabulary_decks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('language', 50).notNullable();
    table.string('name', 200).notNullable();
    table.text('description');
    table.string('theme', 100);
    table.string('difficulty', 20).defaultTo('intermediate');
    table.boolean('is_public').defaultTo(false);
    table.timestamps(true, true);

    table.index(['user_id', 'language']);
    table.index('is_public');
  });

  // 2. Vocabulary cards
  await knex.schema.createTable('vocabulary_cards', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('deck_id')
      .notNullable()
      .references('id')
      .inTable('vocabulary_decks')
      .onDelete('CASCADE');
    table.string('word', 200).notNullable();
    table.string('translation', 200).notNullable();
    table.string('part_of_speech', 50);
    table.string('ipa', 200).comment('IPA pronunciation');
    table.jsonb('example_sentences');
    table.text('mnemonic');
    table.jsonb('synonyms');
    table.jsonb('antonyms');
    table.jsonb('collocations');
    table.text('cultural_note');
    table.text('notes');
    table.timestamps(true, true);

    table.index(['deck_id', 'created_at']);
  });

  // 3. Vocabulary reviews (SM-2 algorithm data)
  await knex.schema.createTable('vocabulary_reviews', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .uuid('card_id')
      .notNullable()
      .references('id')
      .inTable('vocabulary_cards')
      .onDelete('CASCADE');
    table.decimal('easiness_factor', 4, 2).defaultTo(2.5).comment('SM-2 EF: 1.3-2.5');
    table.integer('interval').defaultTo(0).comment('Days until next review');
    table.integer('repetitions').defaultTo(0).comment('Consecutive correct recalls');
    table.timestamp('last_review');
    table.timestamp('next_review');
    table.integer('total_reviews').defaultTo(0);
    table.timestamps(true, true);

    table.unique(['user_id', 'card_id']);
    table.index(['user_id', 'next_review']);
  });

  // 4. Vocabulary review history
  await knex.schema.createTable('vocabulary_review_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .uuid('card_id')
      .notNullable()
      .references('id')
      .inTable('vocabulary_cards')
      .onDelete('CASCADE');
    table.integer('quality').notNullable().comment('0-5: recall quality');
    table.decimal('easiness_factor', 4, 2);
    table.integer('interval');
    table.timestamp('reviewed_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id', 'reviewed_at']);
    table.index('card_id');
  });

  // ==================== WRITING PRACTICE ====================

  // 5. Writing submissions
  await knex.schema.createTable('writing_submissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('language', 50).notNullable();
    table
      .string('writing_type', 50)
      .notNullable()
      .comment('essay, email, story, description, opinion, letter, review, report');
    table.string('difficulty', 20).notNullable();
    table.uuid('prompt_id').comment('If using generated prompt');
    table.text('custom_prompt').comment('Custom user prompt');
    table.string('title', 300);
    table.text('content').notNullable();
    table.integer('word_count');

    // Scores
    table.decimal('overall_score', 5, 2);
    table.decimal('grammar_score', 5, 2);
    table.decimal('vocabulary_score', 5, 2);
    table.decimal('coherence_score', 5, 2);
    table.decimal('style_score', 5, 2);

    // AI analysis
    table.jsonb('corrections').comment('Array of corrections');
    table.jsonb('suggestions').comment('Improvement suggestions');
    table.text('corrected_version');
    table.text('feedback');

    table.timestamp('submitted_at').notNullable().defaultTo(knex.fn.now());
    table.timestamps(true, true);

    table.index(['user_id', 'language', 'submitted_at']);
  });

  // 6. Writing prompts (generated)
  await knex.schema.createTable('writing_prompts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('language', 50).notNullable();
    table.string('writing_type', 50).notNullable();
    table.string('difficulty', 20).notNullable();
    table.string('theme', 100);
    table.string('title', 300).notNullable();
    table.text('prompt').notNullable();
    table.jsonb('keywords');
    table.string('estimated_length', 50);
    table.jsonb('tips');
    table.timestamps(true, true);

    table.index(['language', 'writing_type', 'difficulty']);
  });

  // ==================== PROGRESS TRACKING ====================

  // 7. User study sessions (unified tracking)
  await knex.schema.createTable('study_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('language', 50).notNullable();
    table
      .string('activity_type', 50)
      .notNullable()
      .comment('dialogue, vocabulary, writing, reading, listening');
    table.uuid('activity_id').comment('Reference to specific activity');
    table.integer('duration_minutes');
    table.decimal('score', 5, 2);
    table.jsonb('metadata');
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('ended_at');

    table.index(['user_id', 'language', 'started_at']);
    table.index('activity_type');
  });

  // 8. User progress snapshots (daily/weekly aggregates)
  await knex.schema.createTable('progress_snapshots', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('language', 50).notNullable();
    table.date('snapshot_date').notNullable();
    table
      .string('period_type', 20)
      .notNullable()
      .defaultTo('daily')
      .comment('daily, weekly, monthly');

    // Aggregated metrics
    table.integer('study_minutes');
    table.integer('activities_completed');
    table.integer('words_reviewed');
    table.integer('conversations_completed');
    table.integer('writings_submitted');
    table.decimal('avg_score', 5, 2);
    table.jsonb('skill_scores').comment('speaking, listening, reading, writing, etc.');

    table.timestamps(true, true);

    table.unique(['user_id', 'language', 'snapshot_date', 'period_type']);
    table.index(['user_id', 'language', 'snapshot_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('progress_snapshots');
  await knex.schema.dropTableIfExists('study_sessions');
  await knex.schema.dropTableIfExists('writing_prompts');
  await knex.schema.dropTableIfExists('writing_submissions');
  await knex.schema.dropTableIfExists('vocabulary_review_history');
  await knex.schema.dropTableIfExists('vocabulary_reviews');
  await knex.schema.dropTableIfExists('vocabulary_cards');
  await knex.schema.dropTableIfExists('vocabulary_decks');
}
