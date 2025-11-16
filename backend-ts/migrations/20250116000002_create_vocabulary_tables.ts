import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Vocabulary Items table with SM-2 spaced repetition
  await knex.schema.createTable('vocabulary_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('language').notNullable();
    table.string('word').notNullable();
    table.string('translation').notNullable();
    table.text('context');
    table.string('difficulty').defaultTo('beginner');
    table.string('part_of_speech');

    // SM-2 Spaced Repetition Algorithm fields
    table.integer('repetition_level').defaultTo(0);
    table.decimal('ease_factor', 3, 2).defaultTo(2.5);
    table.integer('interval').defaultTo(0); // days
    table.integer('correct_count').defaultTo(0);
    table.integer('incorrect_count').defaultTo(0);
    table.timestamp('last_reviewed_at');
    table.timestamp('next_review_at').defaultTo(knex.fn.now());

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'language']);
    table.index(['user_id', 'next_review_at']);
    table.index(['language', 'word']);
  });

  console.log('Created vocabulary_items table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('vocabulary_items');
}
