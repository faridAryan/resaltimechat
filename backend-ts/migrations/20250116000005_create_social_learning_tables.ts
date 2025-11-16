import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Generated Lessons table (AI Content Generator)
  await knex.schema.createTable('generated_lessons', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('language').notNullable();
    table.integer('lesson_index'); // Position in series
    table.integer('week_number'); // For curriculum series
    table.string('title').notNullable();
    table.text('native_title'); // Title in target language
    table.jsonb('content').notNullable(); // Full lesson JSON
    table.string('difficulty').notNullable();
    table.integer('estimated_duration').defaultTo(15); // minutes
    table.string('content_type'); // vocabulary, grammar, conversation, etc.
    table.jsonb('objectives'); // Learning objectives
    table.boolean('completed').defaultTo(false);
    table.timestamp('completed_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'language']);
    table.index(['user_id', 'completed']);
    table.index(['difficulty']);
    table.index(['created_at']);
  });

  // Peer Preferences table
  await knex.schema.createTable('peer_preferences', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.jsonb('interests'); // Array of interests
    table.jsonb('availability'); // Timezone, preferred times, days
    table.jsonb('age_range'); // Min/max age preference
    table.integer('preferred_session_duration').defaultTo(30); // minutes
    table.jsonb('preferred_topics'); // Conversation topics
    table.boolean('open_to_matching').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['user_id']);
    table.index(['open_to_matching']);
  });

  // Peer Sessions table
  await knex.schema.createTable('peer_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user1_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('user2_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('language1').notNullable(); // User1's target language
    table.string('language2').notNullable(); // User2's target language
    table.string('room_id').notNullable().unique(); // WebRTC room identifier
    table.integer('duration_minutes').notNullable();
    table.string('split_type').defaultTo('50/50'); // Time split between languages
    table.string('topic'); // Conversation topic
    table.boolean('with_ai_assistant').defaultTo(false);
    table.jsonb('schedule'); // Language switching schedule
    table.string('status').defaultTo('scheduled'); // scheduled, active, completed, cancelled
    table.integer('actual_duration'); // Actual duration in minutes
    table.jsonb('ai_insights'); // AI feedback about the session
    table.timestamp('scheduled_for');
    table.timestamp('started_at');
    table.timestamp('ended_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['user1_id']);
    table.index(['user2_id']);
    table.index(['status']);
    table.index(['scheduled_for']);
    table.index(['created_at']);
  });

  // Peer Interactions table (tracks exchanges during session)
  await knex.schema.createTable('peer_interactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('session_id').notNullable().references('id').inTable('peer_sessions').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('interaction_type').notNullable(); // message, correction, help_request, topic_switch
    table.text('content');
    table.string('language'); // Language of interaction
    table.jsonb('metadata'); // Additional data (corrections, feedback, etc.)
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['session_id']);
    table.index(['user_id']);
    table.index(['created_at']);
  });

  // Lesson Completions table (tracks user progress through generated lessons)
  await knex.schema.createTable('lesson_completions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('lesson_id').notNullable().references('id').inTable('generated_lessons').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('completion_percentage').defaultTo(0);
    table.integer('exercises_completed').defaultTo(0);
    table.integer('total_exercises');
    table.decimal('score', 4, 2); // 0-100
    table.integer('time_spent_minutes');
    table.jsonb('exercise_results'); // Detailed results per exercise
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['lesson_id', 'user_id']);
    table.index(['user_id']);
    table.index(['lesson_id']);
    table.index(['completed_at']);
  });

  // Conversation Scenarios table (predefined scenarios for simulator)
  await knex.schema.createTable('conversation_scenarios', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('scenario_key').notNullable().unique();
    table.string('title').notNullable();
    table.text('description');
    table.string('language').notNullable();
    table.string('difficulty').notNullable();
    table.jsonb('roles'); // Available roles
    table.jsonb('situations'); // Available situations within scenario
    table.jsonb('objectives'); // Learning objectives
    table.jsonb('vocabulary_hints'); // Suggested vocabulary
    table.jsonb('grammar_points'); // Grammar concepts covered
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['scenario_key']);
    table.index(['language', 'difficulty']);
    table.index(['is_active']);
  });

  // User Achievements Progress table (enhanced gamification)
  await knex.schema.createTable('achievement_progress', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('achievement_id').notNullable().references('id').inTable('achievements').onDelete('CASCADE');
    table.integer('current_progress').defaultTo(0);
    table.integer('target_progress').notNullable();
    table.decimal('completion_percentage', 5, 2).defaultTo(0);
    table.timestamp('last_updated_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'achievement_id']);
    table.index(['user_id']);
    table.index(['achievement_id']);
  });

  console.log('Created AI content, conversation simulator, and peer learning tables');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('achievement_progress');
  await knex.schema.dropTableIfExists('conversation_scenarios');
  await knex.schema.dropTableIfExists('lesson_completions');
  await knex.schema.dropTableIfExists('peer_interactions');
  await knex.schema.dropTableIfExists('peer_sessions');
  await knex.schema.dropTableIfExists('peer_preferences');
  await knex.schema.dropTableIfExists('generated_lessons');
}
