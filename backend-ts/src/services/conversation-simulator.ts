import { GeminiVoiceService } from './gemini-voice-service';
import { KnexDBService } from './knex-db-service';
import { RLCurriculumService } from './rl-curriculum-service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Real-Time Conversation Simulator
 * Interactive role-play scenarios with Gemini Live API
 * Simulates real-world conversations for language practice
 */
export class ConversationSimulatorService {
  private geminiVoice: GeminiVoiceService;
  private db: KnexDBService;
  private rlService: RLCurriculumService;

  // Available scenarios - 30 real-world situations
  private readonly SCENARIOS = {
    restaurant: {
      title: 'Ordering at a Restaurant',
      description: 'Practice ordering food, asking questions, and making requests',
      difficulty: ['beginner', 'intermediate', 'advanced'],
      roles: ['customer', 'waiter'],
      situations: [
        'Making a reservation',
        'Ordering food',
        'Asking about ingredients',
        'Requesting the bill',
        'Complaining about food',
      ],
    },
    airport: {
      title: 'At the Airport',
      description: 'Navigate check-in, security, and boarding',
      difficulty: ['intermediate', 'advanced'],
      roles: ['passenger', 'staff'],
      situations: [
        'Checking in',
        'Going through security',
        'Asking for directions',
        'Reporting lost luggage',
        'Changing flights',
      ],
    },
    jobInterview: {
      title: 'Job Interview',
      description: 'Professional conversation practice',
      difficulty: ['advanced'],
      roles: ['candidate', 'interviewer'],
      situations: [
        'Introducing yourself',
        'Describing experience',
        'Answering behavioral questions',
        'Asking about the role',
        'Salary negotiation',
      ],
    },
    shopping: {
      title: 'Shopping',
      description: 'Buying items and negotiating',
      difficulty: ['beginner', 'intermediate'],
      roles: ['customer', 'salesperson'],
      situations: [
        'Asking for sizes',
        'Trying on clothes',
        'Asking for prices',
        'Returning items',
        'Getting recommendations',
      ],
    },
    doctor: {
      title: 'Doctor Visit',
      description: 'Describing symptoms and understanding medical advice',
      difficulty: ['intermediate', 'advanced'],
      roles: ['patient', 'doctor'],
      situations: [
        'Describing symptoms',
        'Medical history',
        'Understanding diagnosis',
        'Asking about medication',
        'Making a follow-up appointment',
      ],
    },
    hotel: {
      title: 'Hotel Check-in',
      description: 'Hotel services and requests',
      difficulty: ['beginner', 'intermediate'],
      roles: ['guest', 'receptionist'],
      situations: [
        'Checking in',
        'Asking about amenities',
        'Room service',
        'Reporting issues',
        'Checking out',
      ],
    },
    directions: {
      title: 'Asking for Directions',
      description: 'Navigation and location-based conversations',
      difficulty: ['beginner', 'intermediate'],
      roles: ['tourist', 'local'],
      situations: [
        'Finding a landmark',
        'Using public transportation',
        'Understanding directions',
        'Asking about distance',
        'Confirming location',
      ],
    },
    smallTalk: {
      title: 'Small Talk & Social',
      description: 'Casual conversations and socializing',
      difficulty: ['beginner', 'intermediate', 'advanced'],
      roles: ['person1', 'person2'],
      situations: [
        'Meeting someone new',
        'Talking about weather',
        'Discussing hobbies',
        'Making plans',
        'Talking about family',
      ],
    },
    // NEW SCENARIOS (9-30)
    pharmacy: {
      title: 'At the Pharmacy',
      description: 'Getting prescriptions and asking about medication',
      difficulty: ['intermediate', 'advanced'],
      roles: ['customer', 'pharmacist'],
      situations: [
        'Picking up a prescription',
        'Asking about side effects',
        'Requesting over-the-counter medicine',
        'Understanding dosage instructions',
        'Asking for alternatives',
      ],
    },
    bank: {
      title: 'Banking Services',
      description: 'Managing finances and bank transactions',
      difficulty: ['intermediate', 'advanced'],
      roles: ['customer', 'banker'],
      situations: [
        'Opening an account',
        'Reporting a lost card',
        'Applying for a loan',
        'Currency exchange',
        'Understanding fees',
      ],
    },
    gym: {
      title: 'At the Gym',
      description: 'Fitness conversations and personal training',
      difficulty: ['beginner', 'intermediate'],
      roles: ['member', 'trainer'],
      situations: [
        'Signing up for membership',
        'Asking about classes',
        'Using equipment',
        'Discussing fitness goals',
        'Booking a personal trainer',
      ],
    },
    carRental: {
      title: 'Renting a Car',
      description: 'Vehicle rental and road assistance',
      difficulty: ['intermediate', 'advanced'],
      roles: ['customer', 'agent'],
      situations: [
        'Renting a vehicle',
        'Understanding insurance options',
        'Reporting damage',
        'Asking for GPS/extras',
        'Returning the car',
      ],
    },
    realEstate: {
      title: 'Apartment Hunting',
      description: 'Finding and renting accommodation',
      difficulty: ['intermediate', 'advanced'],
      roles: ['tenant', 'landlord'],
      situations: [
        'Inquiring about listings',
        'Viewing an apartment',
        'Negotiating rent',
        'Understanding lease terms',
        'Reporting maintenance issues',
      ],
    },
    hairSalon: {
      title: 'Hair Salon',
      description: 'Beauty services and styling',
      difficulty: ['beginner', 'intermediate'],
      roles: ['client', 'stylist'],
      situations: [
        'Making an appointment',
        'Describing desired hairstyle',
        'Asking for recommendations',
        'Discussing hair products',
        'Expressing dissatisfaction',
      ],
    },
    postOffice: {
      title: 'Post Office',
      description: 'Mailing packages and postal services',
      difficulty: ['beginner', 'intermediate'],
      roles: ['customer', 'clerk'],
      situations: [
        'Sending a package',
        'Buying stamps',
        'Tracking a shipment',
        'International shipping',
        'Picking up mail',
      ],
    },
    library: {
      title: 'Public Library',
      description: 'Library services and book borrowing',
      difficulty: ['beginner', 'intermediate'],
      roles: ['patron', 'librarian'],
      situations: [
        'Getting a library card',
        'Finding books',
        'Renewing items',
        'Using computers',
        'Asking for recommendations',
      ],
    },
    emergencyRoom: {
      title: 'Emergency Room',
      description: 'Urgent medical situations',
      difficulty: ['advanced'],
      roles: ['patient', 'nurse'],
      situations: [
        'Describing an injury',
        'Providing medical history',
        'Understanding triage',
        'Consenting to treatment',
        'Discharge instructions',
      ],
    },
    mechanic: {
      title: 'Auto Repair Shop',
      description: 'Car problems and maintenance',
      difficulty: ['intermediate', 'advanced'],
      roles: ['customer', 'mechanic'],
      situations: [
        'Describing car problems',
        'Getting a quote',
        'Understanding repairs needed',
        'Scheduling service',
        'Disputing charges',
      ],
    },
    parentTeacher: {
      title: 'Parent-Teacher Conference',
      description: 'Discussing child\'s education',
      difficulty: ['advanced'],
      roles: ['parent', 'teacher'],
      situations: [
        'Discussing academic performance',
        'Behavioral concerns',
        'Setting goals',
        'Understanding curriculum',
        'Requesting accommodations',
      ],
    },
    customerService: {
      title: 'Customer Service Call',
      description: 'Resolving issues over the phone',
      difficulty: ['intermediate', 'advanced'],
      roles: ['customer', 'representative'],
      situations: [
        'Reporting a problem',
        'Requesting a refund',
        'Changing a subscription',
        'Technical support',
        'Filing a complaint',
      ],
    },
    businessMeeting: {
      title: 'Business Meeting',
      description: 'Professional workplace discussions',
      difficulty: ['advanced'],
      roles: ['colleague', 'manager'],
      situations: [
        'Presenting an idea',
        'Discussing project timelines',
        'Giving feedback',
        'Negotiating deadlines',
        'Problem-solving',
      ],
    },
    cafe: {
      title: 'Coffee Shop',
      description: 'Ordering drinks and casual conversations',
      difficulty: ['beginner', 'intermediate'],
      roles: ['customer', 'barista'],
      situations: [
        'Ordering coffee',
        'Asking about menu items',
        'Customizing drinks',
        'Using WiFi',
        'Chatting with regulars',
      ],
    },
    movieTheater: {
      title: 'Movie Theater',
      description: 'Entertainment and ticket purchasing',
      difficulty: ['beginner', 'intermediate'],
      roles: ['customer', 'employee'],
      situations: [
        'Buying tickets',
        'Asking about showtimes',
        'Ordering concessions',
        'Requesting assistance',
        'Discussing the movie',
      ],
    },
    veterinarian: {
      title: 'Veterinary Clinic',
      description: 'Pet health and care',
      difficulty: ['intermediate', 'advanced'],
      roles: ['pet_owner', 'veterinarian'],
      situations: [
        'Describing pet symptoms',
        'Vaccination schedules',
        'Understanding treatment',
        'Asking about diet',
        'Emergency pet care',
      ],
    },
    university: {
      title: 'University Enrollment',
      description: 'Academic advising and course registration',
      difficulty: ['intermediate', 'advanced'],
      roles: ['student', 'advisor'],
      situations: [
        'Choosing classes',
        'Understanding requirements',
        'Discussing major options',
        'Financial aid questions',
        'Academic planning',
      ],
    },
    neighborConversation: {
      title: 'Talking to Neighbors',
      description: 'Community and neighborhood interactions',
      difficulty: ['beginner', 'intermediate', 'advanced'],
      roles: ['neighbor1', 'neighbor2'],
      situations: [
        'Introducing yourself',
        'Discussing noise issues',
        'Community events',
        'Borrowing items',
        'Friendly chitchat',
      ],
    },
    courtroom: {
      title: 'Legal Consultation',
      description: 'Legal matters and formal proceedings',
      difficulty: ['advanced'],
      roles: ['client', 'lawyer'],
      situations: [
        'Explaining legal issue',
        'Understanding rights',
        'Discussing strategy',
        'Contract review',
        'Court preparation',
      ],
    },
    sportsEvent: {
      title: 'At a Sports Event',
      description: 'Spectator conversations and venue navigation',
      difficulty: ['beginner', 'intermediate'],
      roles: ['fan1', 'fan2'],
      situations: [
        'Buying tickets',
        'Finding seats',
        'Discussing the game',
        'Ordering food/drinks',
        'Celebrating/commiserating',
      ],
    },
    techSupport: {
      title: 'Tech Store',
      description: 'Technology purchases and troubleshooting',
      difficulty: ['intermediate', 'advanced'],
      roles: ['customer', 'technician'],
      situations: [
        'Comparing products',
        'Asking about features',
        'Troubleshooting devices',
        'Understanding warranties',
        'Returning/exchanging items',
      ],
    },
    groceryStore: {
      title: 'Grocery Shopping',
      description: 'Food shopping and product inquiries',
      difficulty: ['beginner', 'intermediate'],
      roles: ['shopper', 'employee'],
      situations: [
        'Finding items',
        'Asking about products',
        'Using self-checkout',
        'Inquiring about sales',
        'Requesting assistance',
      ],
    },
  };

  constructor() {
    this.geminiVoice = new GeminiVoiceService();
    this.db = KnexDBService.getInstance();
    this.rlService = new RLCurriculumService();
  }

  /**
   * Start a new conversation simulation session
   */
  async startSimulation(
    userId: string,
    language: string,
    scenarioType: keyof typeof this.SCENARIOS,
    options: {
      difficulty?: string;
      situation?: string;
      userRole?: string;
      duration?: number; // minutes
      enableHints?: boolean;
      realTimeCorrection?: boolean;
    } = {}
  ): Promise<{
    sessionId: string;
    scenario: any;
    initialPrompt: string;
    audioGreeting: Buffer;
  }> {
    const scenario = this.SCENARIOS[scenarioType];
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioType}`);
    }

    // Determine difficulty
    const difficulty = options.difficulty || 'intermediate';
    if (!scenario.difficulty.includes(difficulty)) {
      throw new Error(`Scenario ${scenarioType} not available at ${difficulty} level`);
    }

    // Create session in database
    const sessionId = uuidv4();
    const studySession = await this.db.createStudySession({
      userId,
      language,
      sessionType: 'conversation_simulator',
      difficulty,
      metadata: {
        scenarioType,
        situation: options.situation,
        userRole: options.userRole || scenario.roles[0],
        enableHints: options.enableHints ?? true,
        realTimeCorrection: options.realTimeCorrection ?? true,
      },
    });

    // Build context for Gemini
    const context = this.buildScenarioContext(
      scenario,
      language,
      difficulty,
      options.situation || scenario.situations[0],
      options.userRole || scenario.roles[1] // AI plays opposite role
    );

    // Start Gemini voice session
    const geminiSession = await this.geminiVoice.startLiveAudioSession({
      language,
      learningContext: context,
      userLevel: difficulty,
      voicePreset: this.selectVoiceForRole(options.userRole || scenario.roles[1]),
    });

    // Generate initial greeting
    const greeting = this.generateGreeting(scenario, language, difficulty);
    const audioGreeting = await this.geminiVoice.generateSpeech(greeting, language, {
      emotionalTone: 'friendly',
      speakingRate: difficulty === 'beginner' ? 0.8 : 1.0,
    });

    return {
      sessionId: studySession.id,
      scenario: {
        type: scenarioType,
        ...scenario,
        selectedSituation: options.situation || scenario.situations[0],
        userRole: options.userRole || scenario.roles[0],
        aiRole: options.userRole === scenario.roles[0] ? scenario.roles[1] : scenario.roles[0],
      },
      initialPrompt: greeting,
      audioGreeting: audioGreeting.audioBuffer,
    };
  }

  /**
   * Process user's audio input and get AI response
   */
  async processConversation(
    sessionId: string,
    audioBuffer: Buffer,
    options: {
      requestHint?: boolean;
      skipCorrection?: boolean;
    } = {}
  ): Promise<{
    transcript: string;
    aiResponse: string;
    audioResponse: Buffer;
    pronunciationFeedback?: any;
    grammarCorrections?: any[];
    hint?: string;
    conversationState: {
      turnsCompleted: number;
      scenarioProgress: number;
      shouldContinue: boolean;
      objectivesCompleted: string[];
    };
  }> {
    // Get session details
    const session = await this.db.getKnex()('study_sessions').where({ id: sessionId }).first();
    if (!session) {
      throw new Error('Session not found');
    }

    const metadata = session.metadata;
    const conversationHistory = await this.getConversationHistory(sessionId);

    // Process audio with Gemini
    const result = await this.geminiVoice.conversationPractice(audioBuffer, {
      topic: metadata.scenarioType,
      language: session.language,
      userLevel: session.difficulty,
      previousMessages: conversationHistory,
    });

    // Save user message
    await this.saveMessage(sessionId, 'user', result.transcript, {
      pronunciationScore: result.emotionalAnalysis?.confidence,
      emotionalTone: result.emotionalAnalysis?.detectedEmotion,
    });

    // Analyze conversation progress
    const conversationState = await this.analyzeConversationState(
      sessionId,
      metadata.scenarioType,
      conversationHistory.length + 1
    );

    // Generate hint if requested or if user is struggling
    let hint: string | undefined;
    if (options.requestHint || conversationState.scenarioProgress < 0.3) {
      hint = await this.generateHint(
        session.language,
        metadata.scenarioType,
        metadata.situation,
        conversationHistory
      );
    }

    // Save AI message
    await this.saveMessage(sessionId, 'assistant', result.emotionalAnalysis.appropriateResponse, {
      feedback: result.feedback,
      suggestedFollowUp: result.suggestedFollowUp,
    });

    // Get pronunciation feedback if enabled
    let pronunciationFeedback;
    if (!options.skipCorrection && metadata.realTimeCorrection) {
      pronunciationFeedback = {
        score: result.emotionalAnalysis.confidence * 100,
        feedback: result.feedback,
      };
    }

    return {
      transcript: result.transcript,
      aiResponse: result.emotionalAnalysis.appropriateResponse,
      audioResponse: result.audioResponse,
      pronunciationFeedback,
      hint,
      conversationState,
    };
  }

  /**
   * End simulation and get comprehensive feedback
   */
  async endSimulation(
    sessionId: string
  ): Promise<{
    summary: any;
    feedback: any;
    achievements: string[];
    rlUpdate: any;
  }> {
    const session = await this.db.getKnex()('study_sessions').where({ id: sessionId }).first();
    const messages = await this.getConversationHistory(sessionId);

    // Calculate session metrics
    const metrics = this.calculateSessionMetrics(messages);

    // Generate comprehensive feedback
    const feedback = await this.generateFeedback(
      session.language,
      session.metadata.scenarioType,
      messages,
      metrics
    );

    // Update RL curriculum based on performance
    const rlUpdate = await this.rlService.updateFromPerformance(
      session.user_id,
      session.language,
      {
        topic: 'conversation',
        difficulty: session.difficulty,
        contentType: 'speaking',
      },
      {
        accuracy: metrics.averageAccuracy,
        timeSpent: metrics.duration,
        completed: true,
        enjoyment: metrics.engagement,
      }
    );

    // Award achievements
    const achievements = this.checkAchievements(metrics);

    // End session
    await this.db.endStudySession(sessionId, metrics.xpEarned, metrics.duration);

    return {
      summary: {
        duration: metrics.duration,
        turnsCompleted: messages.length,
        averagePronunciation: metrics.averagePronunciation,
        vocabularyUsed: metrics.uniqueWords,
        grammarAccuracy: metrics.grammarAccuracy,
      },
      feedback,
      achievements,
      rlUpdate,
    };
  }

  /**
   * Get available scenarios for user's level
   */
  getAvailableScenarios(difficulty: string): any[] {
    return Object.entries(this.SCENARIOS)
      .filter(([_, scenario]) => scenario.difficulty.includes(difficulty))
      .map(([key, scenario]) => ({
        id: key,
        ...scenario,
      }));
  }

  /**
   * Build scenario context for Gemini
   */
  private buildScenarioContext(
    scenario: any,
    language: string,
    difficulty: string,
    situation: string,
    aiRole: string
  ): string {
    return `You are participating in a ${language} language learning role-play exercise.

**Scenario:** ${scenario.title}
**Situation:** ${situation}
**Your Role:** ${aiRole}
**Difficulty Level:** ${difficulty}

**Your Responsibilities:**
1. Stay completely in character as ${aiRole}
2. Speak naturally in ${language} at ${difficulty} level
3. React realistically to the user's responses
4. Gently correct pronunciation errors
5. Provide vocabulary hints when user struggles
6. Keep the conversation flowing naturally
7. Challenge the user appropriately for their level

**Conversation Guidelines:**
- Use vocabulary appropriate for ${difficulty} level
- Speak at a natural pace (slightly slower for beginners)
- Include authentic ${language} cultural elements
- Ask follow-up questions to keep conversation going
- If user makes mistakes, model correct usage without explicitly correcting
- Show appropriate emotions and reactions

**Scenario-Specific Context:**
${this.getScenarioSpecificContext(scenario.title, aiRole)}

Begin the conversation with a natural greeting in character.`;
  }

  /**
   * Get scenario-specific details
   */
  private getScenarioSpecificContext(scenarioTitle: string, role: string): string {
    const contexts: Record<string, Record<string, string>> = {
      'Ordering at a Restaurant': {
        waiter: 'You work at a busy restaurant. Be friendly, helpful, and professional. Ask about dietary restrictions. Recommend menu items.',
        customer: 'You are dining at a restaurant. Look at the menu, ask questions, and place your order.',
      },
      'At the Airport': {
        staff: 'You are airline/airport staff. Be efficient and clear. Help with check-in, baggage, and boarding.',
        passenger: 'You are traveling. You need to check in, find your gate, and board your flight.',
      },
      'Job Interview': {
        interviewer: 'You are conducting a professional interview. Ask about experience, skills, and fit for the role.',
        candidate: 'You are interviewing for a job. Highlight your qualifications and ask thoughtful questions.',
      },
    };

    return contexts[scenarioTitle]?.[role] || 'Play your role naturally and authentically.';
  }

  /**
   * Generate contextual greeting
   */
  private generateGreeting(scenario: any, language: string, difficulty: string): string {
    const greetings: Record<string, Record<string, string>> = {
      restaurant: {
        beginner: 'Hello! Welcome to our restaurant. How can I help you today?',
        intermediate: 'Good evening! Do you have a reservation with us?',
        advanced: 'Welcome! Table for how many? Would you prefer indoor or outdoor seating?',
      },
      airport: {
        intermediate: 'Good morning! Can I see your passport and ticket, please?',
        advanced: 'Hello! Are you checking bags today, or traveling with carry-on only?',
      },
    };

    return greetings[scenario.title]?.[difficulty] || 'Hello! How can I help you?';
  }

  /**
   * Select appropriate voice for role
   */
  private selectVoiceForRole(role: string): string {
    const voiceMap: Record<string, string> = {
      waiter: 'Kore', // Professional
      customer: 'Puck', // Friendly
      staff: 'Charon', // Professional
      passenger: 'Aoede', // Friendly
      interviewer: 'Fenrir', // Authoritative
      candidate: 'Puck', // Confident
      salesperson: 'Aoede', // Warm
      doctor: 'Kore', // Professional
      patient: 'Puck', // Concerned
    };

    return voiceMap[role] || 'Puck';
  }

  /**
   * Get conversation history
   */
  private async getConversationHistory(sessionId: string): Promise<any[]> {
    const messages = await this.db
      .getKnex()('conversation_messages as cm')
      .join('conversations as c', 'cm.conversation_id', 'c.id')
      .where('c.session_id', sessionId)
      .select('cm.role', 'cm.content')
      .orderBy('cm.created_at', 'asc');

    return messages;
  }

  /**
   * Save conversation message
   */
  private async saveMessage(
    sessionId: string,
    role: string,
    content: string,
    metadata: any = {}
  ): Promise<void> {
    // Get or create conversation
    let conversation = await this.db
      .getKnex()('conversations')
      .where({ session_id: sessionId })
      .first();

    if (!conversation) {
      const session = await this.db.getKnex()('study_sessions').where({ id: sessionId }).first();
      [conversation] = await this.db
        .getKnex()('conversations')
        .insert({
          id: uuidv4(),
          user_id: session.user_id,
          session_id: sessionId,
          language: session.language,
          difficulty: session.difficulty,
          topic: session.metadata.scenarioType,
        })
        .returning('*');
    }

    await this.db.addConversationMessage({
      conversationId: conversation.id,
      role,
      content,
      ...metadata,
    });
  }

  /**
   * Analyze conversation state
   */
  private async analyzeConversationState(
    sessionId: string,
    scenarioType: string,
    turnCount: number
  ): Promise<any> {
    const scenario = this.SCENARIOS[scenarioType as keyof typeof this.SCENARIOS];
    const expectedTurns = 10; // Average conversation length

    return {
      turnsCompleted: turnCount,
      scenarioProgress: Math.min(turnCount / expectedTurns, 1.0),
      shouldContinue: turnCount < 20, // Max 20 turns
      objectivesCompleted: [], // Could track specific objectives
    };
  }

  /**
   * Generate contextual hint
   */
  private async generateHint(
    language: string,
    scenarioType: string,
    situation: string,
    conversationHistory: any[]
  ): Promise<string> {
    // Simple hints based on scenario
    const hints: Record<string, string[]> = {
      restaurant: [
        'Try asking "What do you recommend?"',
        'You can say "I would like..." to order',
        'Ask "What are the ingredients in this dish?"',
      ],
      airport: [
        'Say "I have a bag to check"',
        'Ask "Where is gate B12?"',
        'Try "When does boarding start?"',
      ],
    };

    const scenarioHints = hints[scenarioType] || ['Keep the conversation going!'];
    return scenarioHints[Math.floor(Math.random() * scenarioHints.length)];
  }

  /**
   * Calculate session metrics
   */
  private calculateSessionMetrics(messages: any[]): any {
    const userMessages = messages.filter((m) => m.role === 'user');

    return {
      duration: Math.ceil(messages.length * 1.5), // Estimate
      averageAccuracy: 0.75, // Placeholder
      averagePronunciation: 80,
      uniqueWords: 50, // Placeholder
      grammarAccuracy: 0.8,
      engagement: 0.85,
      xpEarned: messages.length * 10,
    };
  }

  /**
   * Generate comprehensive feedback
   */
  private async generateFeedback(
    language: string,
    scenarioType: string,
    messages: any[],
    metrics: any
  ): Promise<any> {
    return {
      strengths: ['Good pronunciation', 'Natural conversation flow'],
      improvements: ['Try using more varied vocabulary', 'Practice question forms'],
      vocabularyLearned: ['reservation', 'menu', 'recommend'],
      nextSteps: 'Try the airport scenario next!',
    };
  }

  /**
   * Check for achievements
   */
  private checkAchievements(metrics: any): string[] {
    const achievements: string[] = [];

    if (metrics.averagePronunciation >= 90) {
      achievements.push('Perfect Pronunciation');
    }

    if (metrics.duration >= 10) {
      achievements.push('Conversation Master');
    }

    return achievements;
  }
}
