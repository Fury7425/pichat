import tokensJson from './figmaTokens';

type TokensJson = typeof tokensJson;

export const designTokens = tokensJson as TokensJson;
