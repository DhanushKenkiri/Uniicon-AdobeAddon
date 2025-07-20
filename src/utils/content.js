// Simple content filtering for safe icon generation

const problematicWords = {
  violence: ['shooting', 'attacking', 'fighting', 'killing', 'destroying'],
  weapons: ['gun', 'rifle', 'sword', 'knife', 'bomb'],
  inappropriate: ['nude', 'naked', 'sexual', 'explicit']
};

const safeReplacements = {
  'shooting': 'launching',
  'attacking': 'approaching', 
  'fighting': 'competing',
  'killing': 'defeating',
  'destroying': 'transforming',
  'gun': 'launcher',
  'rifle': 'tool',
  'sword': 'blade',
  'knife': 'cutting tool',
  'bomb': 'sphere',
  'nude': 'minimalist',
  'naked': 'simple',
  'sexual': 'elegant',
  'explicit': 'detailed'
};

export function screenPrompt(prompt) {
  let cleanedPrompt = prompt;
  const flaggedWords = [];
  
  // Check and replace problematic words
  for (const [category, words] of Object.entries(problematicWords)) {
    for (const word of words) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      if (regex.test(cleanedPrompt)) {
        flaggedWords.push({ word, category });
        
        if (safeReplacements[word.toLowerCase()]) {
          cleanedPrompt = cleanedPrompt.replace(regex, safeReplacements[word.toLowerCase()]);
        }
      }
    }
  }
  
  return {
    isClean: flaggedWords.length === 0,
    flaggedWords,
    cleanedPrompt
  };
}
