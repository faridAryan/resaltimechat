import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { MilvusService } from './milvus-service';
import { KnexDBService } from './knex-db-service';
import { v4 as uuidv4 } from 'uuid';

/**
 * AI-Powered Content Generation Service
 * Generates unlimited personalized lessons using LangChain + Gemini
 * Stores content in Milvus for RAG retrieval
 */
export class AIContentGeneratorService {
  private gemini: GoogleGenerativeAI;
  private langchain: ChatOpenAI;
  private milvus: MilvusService;
  private db: KnexDBService;

  constructor() {
    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.langchain = new ChatOpenAI({
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.8, // Higher for creative content generation
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    this.milvus = new MilvusService();
    this.db = KnexDBService.getInstance();
  }

  /**
   * Generate personalized lesson based on curriculum state and weak areas
   */
  async generatePersonalizedLesson(
    userId: string,
    language: string,
    options: {
      topic?: string;
      difficulty?: string;
      contentType?: 'vocabulary' | 'grammar' | 'conversation' | 'reading' | 'listening';
      duration?: number; // minutes
    } = {}
  ): Promise<{
    lessonId: string;
    title: string;
    content: any;
    exercises: any[];
    estimatedDuration: number;
  }> {
    // Get user's curriculum state
    const curriculumState = await this.db.getCurriculumState(userId, language);
    const memoryPatterns = await this.db.getMemoryPatterns(userId, language);

    // Determine weak areas
    const weakTopics = this.identifyWeakTopics(curriculumState);
    const commonErrors = this.extractCommonErrors(memoryPatterns);

    // Generate lesson using Gemini
    const lesson = await this.generateLessonContent(
      language,
      {
        topic: options.topic || weakTopics[0],
        difficulty: options.difficulty || curriculumState?.currentDifficultyBand || 'intermediate',
        contentType: options.contentType || 'conversation',
        weakAreas: weakTopics,
        commonErrors,
        userLevel: curriculumState?.estimatedProficiency || 0.5,
        duration: options.duration || 15,
      }
    );

    // Store in database
    const lessonId = uuidv4();
    await this.saveLessonToDatabase(lessonId, userId, language, lesson);

    // Store in Milvus for RAG retrieval
    await this.indexLessonInMilvus(lessonId, userId, language, lesson);

    return {
      lessonId,
      ...lesson,
    };
  }

  /**
   * Generate lesson content using Gemini
   */
  private async generateLessonContent(
    language: string,
    params: {
      topic: string;
      difficulty: string;
      contentType: string;
      weakAreas: string[];
      commonErrors: string[];
      userLevel: number;
      duration: number;
    }
  ): Promise<any> {
    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    const prompt = this.buildLessonPrompt(language, params);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const lessonText = response.text();

    // Parse JSON response
    try {
      const jsonMatch = lessonText.match(/```json\n([\s\S]*?)\n```/) || lessonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
      throw new Error('Could not parse lesson JSON');
    } catch (error) {
      console.error('Failed to parse lesson:', error);
      // Fallback: create basic lesson structure
      return this.createFallbackLesson(language, params);
    }
  }

  /**
   * Build comprehensive lesson generation prompt
   */
  private buildLessonPrompt(language: string, params: any): string {
    return `Generate a comprehensive ${language} lesson in JSON format.

**Lesson Parameters:**
- Topic: ${params.topic}
- Difficulty: ${params.difficulty}
- Content Type: ${params.contentType}
- Duration: ${params.duration} minutes
- User Proficiency: ${(params.userLevel * 100).toFixed(0)}%

**Focus Areas (User's Weak Points):**
${params.weakAreas.map((area: string) => `- ${area}`).join('\n')}

**Common Errors to Address:**
${params.commonErrors.map((error: string) => `- ${error}`).join('\n')}

**Required Structure:**
\`\`\`json
{
  "title": "Engaging lesson title in English",
  "nativeTitle": "Title in ${language}",
  "estimatedDuration": ${params.duration},
  "objectives": [
    "Learning objective 1",
    "Learning objective 2",
    "Learning objective 3"
  ],
  "vocabulary": [
    {
      "word": "word in ${language}",
      "translation": "English translation",
      "partOfSpeech": "noun/verb/adjective/etc",
      "exampleSentence": "Example usage in ${language}",
      "pronunciation": "phonetic pronunciation",
      "difficulty": "beginner/intermediate/advanced"
    }
  ],
  "grammar": [
    {
      "concept": "Grammar concept name",
      "explanation": "Clear explanation",
      "rules": ["Rule 1", "Rule 2"],
      "examples": [
        {
          "sentence": "Example in ${language}",
          "translation": "English translation",
          "breakdown": "Explanation of grammar structure"
        }
      ],
      "commonMistakes": ["Mistake 1", "Mistake 2"]
    }
  ],
  "dialogues": [
    {
      "situation": "Context/setting",
      "participants": ["Person A", "Person B"],
      "conversation": [
        {
          "speaker": "Person A",
          "text": "Dialogue in ${language}",
          "translation": "English translation",
          "notes": "Cultural/grammar notes"
        }
      ],
      "keyPhrases": ["Important phrase 1", "Important phrase 2"]
    }
  ],
  "exercises": [
    {
      "type": "fill-in-blank | multiple-choice | translation | speaking | listening",
      "instruction": "What to do",
      "questions": [
        {
          "question": "The question",
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
          "correctAnswer": "Correct option or answer",
          "explanation": "Why this is correct"
        }
      ],
      "difficulty": "beginner/intermediate/advanced"
    }
  ],
  "culturalNotes": [
    {
      "topic": "Cultural aspect",
      "explanation": "Detailed explanation",
      "tips": ["Tip 1", "Tip 2"]
    }
  ],
  "practiceActivities": [
    {
      "activity": "Activity name",
      "instructions": "How to practice",
      "duration": 5,
      "materials": ["Required materials"]
    }
  ],
  "assessmentCriteria": {
    "vocabularyRetention": "What to assess",
    "grammarAccuracy": "What to assess",
    "conversationalFluency": "What to assess",
    "pronunciation": "What to assess"
  }
}
\`\`\`

**Important:**
1. Include at least 10 vocabulary words
2. Cover 2-3 grammar concepts
3. Provide 2 realistic dialogue scenarios
4. Create 10+ varied exercises
5. Add cultural context where relevant
6. Focus on correcting the user's common errors
7. Target the specified difficulty level
8. Make it engaging and practical

Generate the complete lesson now in valid JSON format.`;
  }

  /**
   * Generate vocabulary-focused lesson
   */
  async generateVocabularyLesson(
    userId: string,
    language: string,
    theme: string,
    wordCount: number = 20
  ): Promise<any> {
    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    const prompt = `Generate ${wordCount} ${language} vocabulary words related to "${theme}".

For each word provide:
1. The word in ${language}
2. English translation
3. Part of speech
4. Example sentence in ${language}
5. English translation of example
6. Mnemonic device to remember it
7. Related words (synonyms, antonyms)

Format as JSON array.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const vocabulary = JSON.parse(response.text());

    // Create vocabulary items in database
    for (const word of vocabulary) {
      await this.db.createVocabularyItem({
        userId,
        language,
        word: word.word,
        translation: word.translation,
        context: word.exampleSentence,
        partOfSpeech: word.partOfSpeech,
        difficulty: 'intermediate',
      });
    }

    return vocabulary;
  }

  /**
   * Generate grammar exercises
   */
  async generateGrammarExercises(
    language: string,
    grammarConcept: string,
    difficulty: string,
    exerciseCount: number = 10
  ): Promise<any> {
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `You are an expert ${language} grammar instructor. Create engaging, practical exercises.`,
      ],
      [
        'user',
        `Create ${exerciseCount} ${difficulty} level exercises for teaching "${grammarConcept}" in ${language}.

Include:
1. Fill-in-the-blank exercises
2. Sentence transformation
3. Error correction
4. Multiple choice
5. Translation practice

Provide clear explanations for each answer.

Return as JSON array with this structure:
[
  {
    "type": "exercise type",
    "question": "the question",
    "correctAnswer": "answer",
    "explanation": "why this is correct",
    "commonMistakes": ["mistake 1", "mistake 2"]
  }
]`,
      ],
    ]);

    const chain = prompt.pipe(this.langchain).pipe(new StringOutputParser());

    const result = await chain.invoke({});
    return JSON.parse(result);
  }

  /**
   * Generate conversation scenarios
   */
  async generateConversationScenarios(
    language: string,
    situation: string,
    difficulty: string
  ): Promise<any> {
    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    const prompt = `Create 3 realistic conversation scenarios in ${language} for the situation: "${situation}"

Difficulty: ${difficulty}

For each scenario:
1. Set the context
2. Define 2-3 participants
3. Write a natural dialogue (6-8 exchanges)
4. Highlight key phrases and vocabulary
5. Add cultural notes
6. Suggest variations for practice

Format as JSON with detailed conversation flows.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  }

  /**
   * Generate reading comprehension passages
   */
  async generateReadingPassage(
    language: string,
    topic: string,
    difficulty: string,
    length: 'short' | 'medium' | 'long' = 'medium'
  ): Promise<any> {
    const wordCounts = { short: 150, medium: 300, long: 500 };
    const targetWords = wordCounts[length];

    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    const prompt = `Write a ${length} reading passage in ${language} about "${topic}".

Target: ~${targetWords} words
Difficulty: ${difficulty}

Include:
1. Engaging narrative or informative text
2. Natural language at the specified level
3. Cultural context
4. 5 comprehension questions (multiple choice)
5. 5 vocabulary words with definitions
6. Discussion prompts

Format as JSON with passage, questions, vocabulary, and discussion prompts.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  }

  /**
   * Generate adaptive lesson series (curriculum)
   */
  async generateLessonSeries(
    userId: string,
    language: string,
    goal: string,
    weeks: number = 4
  ): Promise<any[]> {
    const lessonsPerWeek = 3;
    const totalLessons = weeks * lessonsPerWeek;

    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    const prompt = `Create a ${weeks}-week ${language} learning curriculum to achieve: "${goal}"

Generate ${totalLessons} progressive lessons with:
1. Clear learning path from beginner to goal achievement
2. Gradual difficulty increase
3. Vocabulary building (cumulative)
4. Grammar progression
5. Practical application
6. Review sessions

For each lesson specify:
- Week and day
- Topic
- Objectives
- Key vocabulary (5-10 words)
- Grammar points
- Activities
- Estimated duration

Format as JSON array of lessons.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const series = JSON.parse(response.text());

    // Store entire series
    for (let i = 0; i < series.length; i++) {
      const lesson = series[i];
      const lessonId = uuidv4();

      await this.db.getKnex()('generated_lessons').insert({
        id: lessonId,
        user_id: userId,
        language,
        lesson_index: i,
        title: lesson.title,
        content: JSON.stringify(lesson),
        week_number: Math.floor(i / lessonsPerWeek) + 1,
        difficulty: lesson.difficulty || 'intermediate',
        created_at: new Date(),
      });
    }

    return series;
  }

  /**
   * Helper: Identify weak topics from curriculum state
   */
  private identifyWeakTopics(curriculumState: any): string[] {
    if (!curriculumState?.topicMasteryScores) {
      return ['grammar', 'vocabulary', 'conversation'];
    }

    const scores = Object.entries(curriculumState.topicMasteryScores) as [string, number][];
    return scores
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([topic]) => topic);
  }

  /**
   * Helper: Extract common errors from memory patterns
   */
  private extractCommonErrors(patterns: any[]): string[] {
    const errorPatterns = patterns.find((p) => p.patternType === 'error_patterns');
    if (!errorPatterns) return [];

    const errors = Object.entries(errorPatterns.patternData)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .map(([error]) => error);

    return errors;
  }

  /**
   * Save lesson to database
   */
  private async saveLessonToDatabase(
    lessonId: string,
    userId: string,
    language: string,
    lesson: any
  ): Promise<void> {
    await this.db.getKnex()('generated_lessons').insert({
      id: lessonId,
      user_id: userId,
      language,
      title: lesson.title,
      content: JSON.stringify(lesson),
      difficulty: lesson.difficulty || 'intermediate',
      estimated_duration: lesson.estimatedDuration || 15,
      created_at: new Date(),
    });
  }

  /**
   * Index lesson in Milvus for RAG retrieval
   */
  private async indexLessonInMilvus(
    lessonId: string,
    userId: string,
    language: string,
    lesson: any
  ): Promise<void> {
    // Create chunks from lesson content
    const chunks = [
      `Title: ${lesson.title}. ${lesson.objectives?.join('. ')}`,
      ...lesson.vocabulary?.map((v: any) => `${v.word}: ${v.translation}. ${v.exampleSentence}`) || [],
      ...lesson.grammar?.map((g: any) => `${g.concept}: ${g.explanation}`) || [],
      ...lesson.dialogues?.map((d: any) =>
        d.conversation.map((c: any) => `${c.speaker}: ${c.text}`).join('\n')
      ) || [],
    ];

    await this.milvus.insertDocumentChunks(
      lessonId,
      userId,
      language,
      chunks.map((content, idx) => ({
        chunkIndex: idx,
        content,
        metadata: { type: 'generated_lesson', lessonId },
      }))
    );
  }

  /**
   * Fallback lesson structure
   */
  private createFallbackLesson(language: string, params: any): any {
    return {
      title: `${params.topic} - ${params.difficulty} level`,
      nativeTitle: `${params.topic}`,
      estimatedDuration: params.duration,
      objectives: [`Learn ${params.topic}`, 'Practice conversation', 'Build vocabulary'],
      vocabulary: [],
      grammar: [],
      dialogues: [],
      exercises: [],
      culturalNotes: [],
      practiceActivities: [],
    };
  }
}
