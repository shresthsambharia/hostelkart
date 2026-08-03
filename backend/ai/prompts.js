/**
 * Reusable prompt templates for the AI assistant and system routing.
 */
export const prompts = {
  /**
   * Helper to format ticket data for support drafts or analysis.
   */
  formatTicketSummary: (subject, description, history = []) => {
    const historyString = history
      .map((msg) => `${msg.senderRole} (${msg.senderName}): ${msg.content}`)
      .join('\n');
    return `Please analyze and summarize the following support ticket details:
Subject: ${subject}
Description: ${description}

Message History:
${historyString || 'No history yet.'}`;
  },

  /**
   * Helper to request standard recommendations reasoning.
   */
  generateRecommendationReason: (productName, category, userPreferences = '') => {
    return `Explain briefly in one short sentence why "${productName}" from the "${category}" category is recommended for a student who likes ${userPreferences || 'daily hostel essentials'}.`;
  },
};
