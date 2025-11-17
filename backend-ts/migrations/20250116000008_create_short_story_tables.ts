import { Knex } from 'knex';

/**
 * Migration: Create Short Story Practice Tables
 *
 * Tables for:
 * 1. Short Stories (AI-generated reading content)
 * 2. Story Reading Sessions (user reading progress)
 * 3. Story Collections (curated story sets)
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Short stories
  await knex.schema.createTable('short_stories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('language', 50).notNullable();
    table
      .string('level', 10)
      .notNullable()
      .comment('CEFR level: A1, A2, B1, B2, C1, C2');
    table.string('genre', 50).notNullable();
    table.string('theme', 50);
    table.string('title', 300).notNullable();
    table.text('content').notNullable().comment('Full story text');

    // Story structure
    table.jsonb('paragraphs').comment('Array of paragraphs with key vocab and grammar');
    table.jsonb('vocabulary').comment('Complete vocabulary list with definitions');
    table.jsonb('grammar_concepts').comment('Grammar points explained');
    table
      .jsonb('comprehension_questions')
      .comment('Multiple choice comprehension questions');

    // Metadata
    table.text('moral_lesson');
    table.integer('word_count').notNullable();
    table.integer('estimated_reading_time').comment('Minutes');
    table.jsonb('images').comment('Array of image URLs');

    // AI generation metadata
    table.string('ai_model', 50).defaultTo('gemini-2.0-flash');
    table.text('generation_prompt').comment('Prompt used to generate story');
    table.boolean('is_public').defaultTo(true);

    table.timestamps(true, true);

    // Indexes
    table.index(['language', 'level']);
    table.index('genre');
    table.index('theme');
    table.index(['is_public', 'language', 'level']);
  });

  // 2. Story reading sessions
  await knex.schema.createTable('story_reading_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .uuid('story_id')
      .notNullable()
      .references('id')
      .inTable('short_stories')
      .onDelete('CASCADE');

    // Session tracking
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('ended_at');
    table.integer('reading_time_seconds');
    table
      .string('status', 20)
      .notNullable()
      .defaultTo('reading')
      .comment('reading, paused, completed, abandoned');

    // Performance metrics
    table.decimal('comprehension_score', 5, 2).comment('0-100 score');
    table.integer('reading_speed_wpm').comment('Words per minute');
    table.jsonb('answers').comment('Array of user answers to comprehension questions');

    // Interaction data
    table.jsonb('vocabulary_looked_up').comment('Words user clicked for definitions');
    table.integer('pause_count').defaultTo(0);
    table.integer('replay_count').defaultTo(0);

    table.timestamps(true, true);

    // Indexes
    table.index(['user_id', 'started_at']);
    table.index(['story_id', 'status']);
    table.index(['user_id', 'status']);
  });

  // 3. Story collections (curated sets of stories)
  await knex.schema.createTable('story_collections', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 200).notNullable();
    table.text('description');
    table.string('language', 50).notNullable();
    table.string('level', 10);
    table.string('theme', 50);

    // Collection metadata
    table.integer('story_count').defaultTo(0);
    table.boolean('is_official').defaultTo(false).comment('Created by platform');
    table.boolean('is_public').defaultTo(true);
    table
      .uuid('created_by')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    table.timestamps(true, true);

    // Indexes
    table.index(['language', 'level']);
    table.index(['is_public', 'is_official']);
  });

  // 4. Story collection items (junction table)
  await knex.schema.createTable('story_collection_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('collection_id')
      .notNullable()
      .references('id')
      .inTable('story_collections')
      .onDelete('CASCADE');
    table
      .uuid('story_id')
      .notNullable()
      .references('id')
      .inTable('short_stories')
      .onDelete('CASCADE');
    table.integer('order_index').defaultTo(0);
    table.timestamp('added_at').notNullable().defaultTo(knex.fn.now());

    // Unique constraint
    table.unique(['collection_id', 'story_id']);
    table.index('collection_id');
  });

  // 5. User story bookmarks
  await knex.schema.createTable('story_bookmarks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .uuid('story_id')
      .notNullable()
      .references('id')
      .inTable('short_stories')
      .onDelete('CASCADE');
    table.text('notes');
    table.integer('progress_percentage').defaultTo(0);
    table.timestamp('bookmarked_at').notNullable().defaultTo(knex.fn.now());

    // Unique constraint
    table.unique(['user_id', 'story_id']);
    table.index('user_id');
  });

  // 6. Story ratings and reviews
  await knex.schema.createTable('story_reviews', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .uuid('story_id')
      .notNullable()
      .references('id')
      .inTable('short_stories')
      .onDelete('CASCADE');
    table.integer('rating').notNullable().comment('1-5 stars');
    table.text('review');
    table.jsonb('helpful_aspects').comment('What aspects were helpful');
    table.timestamp('reviewed_at').notNullable().defaultTo(knex.fn.now());

    // Unique constraint
    table.unique(['user_id', 'story_id']);
    table.index(['story_id', 'rating']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('story_reviews');
  await knex.schema.dropTableIfExists('story_bookmarks');
  await knex.schema.dropTableIfExists('story_collection_items');
  await knex.schema.dropTableIfExists('story_collections');
  await knex.schema.dropTableIfExists('story_reading_sessions');
  await knex.schema.dropTableIfExists('short_stories');
}
