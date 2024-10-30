// essayChecker.js
import { llmService } from "./llmService";

const ERROR_CATEGORIES = {
  spelling: [
    'typing_errors',
    'unrecognizable_typing_errors',
    'inflectional_noun_endings',
    'syntactic',
    'capital_letters',
    'compounds'
  ],
  punctuation: [
    'comma',
    'colon',
    'semicolon',
    'dot',
    'triple_dot',
    'constituents',
    'clauses'
  ],
  lexicoSemantic: [
    'broken_meaningfulness',
    'missing_words',
    'incorrect_possessives',
    'incorrect_lexical_choice'
  ],
  stylistic: [
    'incorrect_register',
    'repeated_expressions',
    'noun_cumulation',
    'passive_usage',
    'word_order',
    'clumsy_expressions',
    'sentence_length'
  ],
  typographical: [
    'local_formatting',
    'document_layout',
    'visualization'
  ]
};

export const checkEssayErrors = async (content) => {
  try {
    const systemMessage = {
      role: 'system',
      content: `You are an advanced essay error detection system. Analyze the text and identify ALL errors without any limit, returning them ONLY as a JSON array. Check for these specific error types:
    
    1. Spelling Errors - Look for:
       - Basic typing mistakes (e.g., "teh" instead of "the")
       - Advanced spelling issues (i/y, s/z variations)
       - Incorrect noun endings
       - Agreement errors
       - Capitalization mistakes
       - Compound word errors
    
    2. Punctuation Errors - Check for:
       - Missing or incorrect commas
       - Colon and semicolon misuse
       - Period/dot issues
       - Missing punctuation between clauses
       - Incorrect coordination punctuation
    
    3. Lexico-Semantic Errors - Identify:
       - Phrases that lack clear meaning
       - Missing necessary words
       - Incorrect possessive forms (its/it's)
       - Wrong word choices
       - Semantic contradictions
       - Improper word combinations
    
    4. Stylistic Errors - Look for:
       - Informal language in formal context
       - Word repetition
       - Excessive passive voice
       - Poor word order
       - Overly complex sentences
       - Awkward expressions
    
    5. Typographical Errors - Check:
       - Spacing issues
       - Document structure problems
       - Layout inconsistencies
       - Formatting errors
    
    For EACH error found, create an object:
    {
      "category": "exactly one of: spelling, punctuation, lexicoSemantic, stylistic, typographical",
      "type": "specific subcategory from the error type list",
      "message": "clear explanation of the error",
      "suggestions": ["specific correction suggestions"],
      "text": "the exact problematic text"
    }
    
    IMPORTANT:
    - Return ALL errors found, with no limit per category
    - Do not skip any errors
    - Include every instance of repeated errors
    - Return ONLY the JSON array, with no additional text or explanations
    - Check the entire text thoroughly.
    
    Here are examples to follow, showing both the format and reasoning:
    
    Example 1:
    Text: "He go to the store but forgot his wallet"
    Step-by-step:
      - Spelling: "go" is incorrect verb form; should be "goes".
      - Punctuation: Missing comma between clauses.
    JSON:
    [
      {
        "category": "spelling",
        "type": "incorrect verb form",
        "message": "The verb 'go' is incorrect; should be 'goes' to agree with subject.",
        "suggestions": ["goes"],
        "text": "go"
      },
      {
        "category": "punctuation",
        "type": "missing comma",
        "message": "Missing comma between independent clauses.",
        "suggestions": [", between 'store' and 'but'"],
        "text": "He go to the store but forgot his wallet"
      }
    ]
    
    Example 2:
    Text: "There going to be many people in a short period of time"
    Step-by-step:
      - Spelling: "There" is incorrect; should be "They're" for correct meaning.
      - Lexico-Semantic: "short period of time" is vague and awkward; consider rephrasing.
    JSON:
    [
      {
        "category": "spelling",
        "type": "incorrect word",
        "message": "The word 'There' should be 'They're' to imply 'They are'.",
        "suggestions": ["They're"],
        "text": "There"
      },
      {
        "category": "lexicoSemantic",
        "type": "awkward phrase",
        "message": "'short period of time' is unclear; consider a clearer time frame.",
        "suggestions": ["a brief duration", "a few minutes"],
        "text": "short period of time"
      }
    ]
    
    Now, analyze this new text step-by-step for all errors:
    Text: "${content}"
    JSON:
    `
    };

    const userMessage = {
      role: 'user',
      content: `Analyze this text for ALL errors and return ONLY a JSON array. Find every single error: "${content}"`
    };

    // Use llmService to invoke the AI
    const aiResponse = await llmService.invoke([systemMessage, userMessage]);
    
    // Parse response
    let errors = [];
    const possibleJSON = aiResponse.content.trim();
    
    try {
      errors = JSON.parse(possibleJSON);
    } catch (e) {
      const jsonMatch = possibleJSON.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        try {
          errors = JSON.parse(jsonMatch[0]);
        } catch (innerError) {
          console.error('Failed to parse extracted JSON:', innerError);
        }
      }
    }

    if (!Array.isArray(errors)) {
      console.error('AI response is not an array:', errors);
      errors = [];
    }

    // Validate and categorize errors
    const categorizedErrors = Object.keys(ERROR_CATEGORIES).reduce((acc, category) => {
      acc[category] = errors
        .filter(error => error.category === category)
        .map(error => ({
          ...error,
          suggestions: Array.isArray(error.suggestions) ? 
            error.suggestions : []
        }));
      return acc;
    }, {});

    // Ensure all categories exist
    Object.keys(ERROR_CATEGORIES).forEach(category => {
      if (!categorizedErrors[category]) {
        categorizedErrors[category] = [];
      }
    });

    return categorizedErrors;

  } catch (error) {
    console.error('Error checking essay:', error);
    return Object.keys(ERROR_CATEGORIES).reduce((acc, category) => {
      acc[category] = [];
      return acc;
    }, {});
  }
};
