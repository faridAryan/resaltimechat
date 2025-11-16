import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { BufferMemory } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { LangChainContext, ConversationMessage } from '../models/types';

export class LangChainService {
  private model: ChatOpenAI;

  constructor() {
    this.model = new ChatOpenAI({
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxTokens: 1000,
    });
  }

  /**
   * Generate language practice response with context awareness
   */
  async generatePracticeResponse(
    userMessage: string,
    context: LangChainContext,
    conversationHistory: ConversationMessage[]
  ): Promise<{
    response: string;
    corrections: Array<{ original: string; corrected: string; explanation: string }>;
    feedback: string;
    newVocabulary: string[];
  }> {
    // Build system prompt with context
    const systemPrompt = this.buildSystemPrompt(context);

    // Convert conversation history to LangChain messages
    const messages = [
      new SystemMessage(systemPrompt),
      ...conversationHistory.map(msg => {
        if (msg.role === 'user') return new HumanMessage(msg.content);
        if (msg.role === 'assistant') return new AIMessage(msg.content);
        return new SystemMessage(msg.content);
      }),
      new HumanMessage(userMessage),
    ];

    // Create chain
    const chain = RunnableSequence.from([
      ChatPromptTemplate.fromMessages(messages),
      this.model,
      new StringOutputParser(),
    ]);

    try {
      // Get AI response
      const response = await chain.invoke({});

      // Analyze user message for corrections
      const corrections = await this.analyzeCorrections(userMessage, context.language);

      // Generate feedback
      const feedback = await this.generateFeedback(userMessage, corrections, context);

      // Extract new vocabulary
      const newVocabulary = this.extractVocabulary(response);

      return {
        response,
        corrections,
        feedback,
        newVocabulary,
      };
    } catch (error) {
      console.error('LangChain error:', error);
      throw new Error('Failed to generate practice response');
    }
  }

  /**
   * Build system prompt based on user context
   */
  private buildSystemPrompt(context: LangChainContext): string {
    const { language, difficulty, userLevel, recentTopics, commonErrors, preferences } = context;

    let prompt = `You are a ${language} language tutor AI assistant. Your role is to help users practice ${language} through natural conversation.

**User Profile:**
- Current Level: ${userLevel}
- Difficulty Setting: ${difficulty}
- Common Mistakes: ${commonErrors.join(', ') || 'None identified yet'}
${recentTopics.length > 0 ? `- Recent Topics of Interest: ${recentTopics.join(', ')}` : ''}

**Your Responsibilities:**
1. Engage in natural, contextual conversation in ${language}
2. Adapt to the user's ${difficulty} difficulty level
3. Gently correct mistakes while maintaining conversation flow
4. Introduce new vocabulary appropriate to their level
5. Ask follow-up questions to encourage continued practice
6. Be encouraging and supportive

**Guidelines:**
- Keep responses concise and natural (2-4 sentences)
- Use vocabulary and grammar appropriate for ${difficulty} level
- If the user makes errors, model correct usage naturally in your response
- Reference topics the user has shown interest in: ${recentTopics.join(', ') || 'various topics'}
${preferences.practiceTime ? `- User prefers to practice around ${preferences.practiceTime}` : ''}

**Conversation Style:**
- Be friendly and conversational
- Ask open-ended questions
- Encourage longer responses from the user
- Vary sentence structure and vocabulary
- Use cultural context when appropriate

Remember: Your goal is to create an immersive, supportive learning environment that builds confidence and fluency.`;

    return prompt;
  }

  /**
   * Analyze user message for corrections using LangChain
   */
  private async analyzeCorrections(
    userMessage: string,
    language: string
  ): Promise<Array<{ original: string; corrected: string; explanation: string }>> {
    const correctionPrompt = `Analyze this ${language} text for grammatical errors, spelling mistakes, or unnatural phrasing.
Return ONLY a JSON array of corrections in this format:
[{"original": "...", "corrected": "...", "explanation": "..."}]

If there are no errors, return an empty array: []

Text to analyze: "${userMessage}"

JSON:`;

    try {
      const response = await this.model.invoke([new HumanMessage(correctionPrompt)]);
      const content = response.content as string;

      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const corrections = JSON.parse(jsonMatch[0]);
        return Array.isArray(corrections) ? corrections : [];
      }

      return [];
    } catch (error) {
      console.error('Error analyzing corrections:', error);
      return [];
    }
  }

  /**
   * Generate personalized feedback
   */
  private async generateFeedback(
    userMessage: string,
    corrections: Array<{ original: string; corrected: string; explanation: string }>,
    context: LangChainContext
  ): Promise<string> {
    if (corrections.length === 0) {
      return "Excellent! Your message was grammatically correct and well-structured.";
    }

    const feedbackPrompt = `Provide brief, encouraging feedback (1-2 sentences) about these language corrections:

User's level: ${context.userLevel}
Corrections made: ${corrections.map(c => c.explanation).join('; ')}

Focus on positive reinforcement and one key learning point.

Feedback:`;

    try {
      const response = await this.model.invoke([new HumanMessage(feedbackPrompt)]);
      return (response.content as string).trim();
    } catch (error) {
      console.error('Error generating feedback:', error);
      return 'Keep practicing! Every correction is a step forward in your learning journey.';
    }
  }

  /**
   * Extract new vocabulary words from AI response
   */
  private extractVocabulary(response: string): string[] {
    // Simple extraction: words longer than 5 characters that aren't common
    const words = response.match(/\b[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]{6,}\b/g) || [];
    const commonWords = new Set(['really', 'please', 'thanks', 'always', 'because', 'should', 'important']);

    return [...new Set(words)]
      .filter(word => !commonWords.has(word.toLowerCase()))
      .slice(0, 5);
  }

  /**
   * Generate personalized recommendations using LangChain
   */
  async generateRecommendations(
    context: LangChainContext,
    learningPatterns: Record<string, any>
  ): Promise<{
    topics: string[];
    difficulty: string;
    contentTypes: string[];
    practiceTime?: string;
    focusAreas: string[];
  }> {
    const recommendationPrompt = `Based on this language learner's profile, suggest personalized recommendations:

Level: ${context.userLevel}
Current Difficulty: ${context.difficulty}
Recent Topics: ${context.recentTopics.join(', ')}
Common Errors: ${context.commonErrors.join(', ')}
Learning Patterns: ${JSON.stringify(learningPatterns)}

Provide recommendations in JSON format:
{
  "topics": ["topic1", "topic2", "topic3"],
  "difficulty": "beginner|intermediate|advanced",
  "contentTypes": ["conversation", "reading", "vocabulary", "grammar"],
  "focusAreas": ["area1", "area2", "area3"]
}

JSON:`;

    try {
      const response = await this.model.invoke([new HumanMessage(recommendationPrompt)]);
      const content = response.content as string;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback recommendations
      return {
        topics: context.recentTopics.slice(0, 3),
        difficulty: context.difficulty,
        contentTypes: ['conversation'],
        focusAreas: context.commonErrors.slice(0, 3),
      };
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return {
        topics: ['daily conversation', 'travel', 'food'],
        difficulty: context.difficulty,
        contentTypes: ['conversation', 'vocabulary'],
        focusAreas: ['grammar', 'pronunciation'],
      };
    }
  }

  /**
   * Generate scenario-based conversation prompts
   */
  async generateScenarioPrompt(
    scenario: string,
    language: string,
    difficulty: string
  ): Promise<string> {
    const scenarioPrompt = `Create an engaging opening for a ${language} language practice scenario: "${scenario}"

Difficulty: ${difficulty}

The opening should:
1. Set the scene clearly
2. Be appropriate for ${difficulty} learners
3. Include a natural conversation starter
4. Be 2-3 sentences

Response:`;

    try {
      const response = await this.model.invoke([new HumanMessage(scenarioPrompt)]);
      return (response.content as string).trim();
    } catch (error) {
      console.error('Error generating scenario:', error);
      return `Let's practice ${language} with this scenario: ${scenario}. How would you like to begin?`;
    }
  }
}
