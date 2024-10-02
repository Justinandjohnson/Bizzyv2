export async function interpretSearchResults(
  idea: string,
  searchResults: any[]
) {
  const prompt = `Analyze the following business idea and search results:

Idea: ${idea}

Search Results:
${searchResults
  .map((result) => `- ${result.title}: ${result.snippet}`)
  .join("\n")}

Provide insights on market potential, competition, and feasibility.`;

  return { prompt };
}
