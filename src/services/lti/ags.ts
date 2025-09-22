// LTI Assignment and Grade Services (AGS) for Leit
// Canvas grade passback integration

export interface LineItem {
  id?: string;
  scoreMaximum: number;
  label: string;
  resourceId?: string;
  resourceLinkId?: string;
  tag?: string;
}

export interface Score {
  scoreGiven: number;
  scoreMaximum: number;
  comment?: string;
  timestamp: string;
  activityProgress: 'Initialized' | 'Started' | 'InProgress' | 'Submitted' | 'Completed';
  gradingProgress: 'FullyGraded' | 'Pending' | 'PendingManual' | 'Failed' | 'NotReady';
}

export class AGSService {
  private static canvasApiKey = import.meta.env.VITE_CANVAS_API || process.env.CANVAS_API;
  
  /**
   * Create line item in Canvas gradebook
   * TODO: Implement Canvas AGS line item creation
   */
  static async createLineItem(
    contextId: string,
    title: string,
    maxScore: number
  ): Promise<LineItem | null> {
    // TODO: POST to Canvas AGS line items endpoint
    // TODO: Use Canvas API key for authentication
    // TODO: Handle Canvas API responses and errors
    
    console.log('Line item creation not yet implemented');
    console.log('Canvas API configured:', !!this.canvasApiKey);
    console.log('Would create line item:', { contextId, title, maxScore });
    
    return null;
  }

  /**
   * Post score to Canvas gradebook
   * TODO: Implement Canvas AGS score posting
   */
  static async postScore(
    lineItemId: string,
    userId: string,
    score: Score
  ): Promise<boolean> {
    // TODO: POST to Canvas AGS scores endpoint
    // TODO: Format score according to AGS specification
    // TODO: Handle authentication and error responses
    
    console.log('Score posting not yet implemented');
    console.log('Would post score:', { lineItemId, userId, score });
    
    return false;
  }

  /**
   * Get existing line items for context
   * TODO: Implement Canvas AGS line item retrieval
   */
  static async getLineItems(contextId: string): Promise<LineItem[]> {
    // TODO: GET from Canvas AGS line items endpoint
    // TODO: Parse and return line items
    
    console.log('Line item retrieval not yet implemented');
    console.log('Would get line items for context:', contextId);
    
    return [];
  }

  /**
   * Calculate final score from session performance
   */
  static calculateFinalScore(
    correctAnswers: number,
    totalQuestions: number,
    maxScore: number = 100
  ): Score {
    const percentage = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const scoreGiven = Math.round(percentage * maxScore);
    
    return {
      scoreGiven,
      scoreMaximum: maxScore,
      timestamp: new Date().toISOString(),
      activityProgress: 'Completed',
      gradingProgress: 'FullyGraded',
      comment: `Leit flashcard session: ${correctAnswers}/${totalQuestions} correct (${Math.round(percentage * 100)}%)`
    };
  }
}