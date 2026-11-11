/**
 * Keep the exact server-built prompt inspectable in development only.
 * The assembled prompt stays out of production responses.
 */
export function buildGenerationResponsePayload(
  {
    imageUrl,
    requestId = null,
    sessionId,
    prompt,
    promptVersion,
    selectedMaterialIds,
    materialPromptBlocks,
    fixedRules,
    spatialPlan = null,
  },
  environment = process.env.NODE_ENV
) {
  return {
    imageUrl,
    requestId,
    sessionId,
    spatialPlan,
    ...(environment === 'development'
      ? {
          debug: {
            promptVersion,
            selectedMaterialIds,
            materialPromptBlocks,
            fixedRules,
            prompt,
          },
        }
      : {}),
  };
}
