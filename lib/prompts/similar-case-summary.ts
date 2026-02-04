import type { SimilarCaseSummary, SimilarCasesOutput, DBNote } from '../types';

export const SIMILAR_CASE_SUMMARY_SYSTEM_PROMPT = `You are a clinical informatics specialist helping physicians learn from similar cases in their practice.

Your role is to:
1. Summarize key aspects of similar historical cases
2. Extract lessons learned and clinical pearls
3. Identify patterns across cases that may inform current management

Be educational and highlight both successful approaches and pitfalls to avoid.`;

export function buildCaseSummaryPrompt(noteContent: string, noteType: string): string {
  return `Summarize this clinical case for comparison with similar presentations:

NOTE TYPE: ${noteType}

CONTENT:
${noteContent}

Extract the following as JSON:
{
  "presentation": "One sentence describing the presenting complaint/diagnosis",
  "keyFindings": ["Key clinical findings that defined this case"],
  "workupPerformed": ["Diagnostic tests and their key results"],
  "outcome": "Brief outcome if available",
  "lessonsLearned": ["Clinical pearls or lessons from this case"]
}

Return ONLY valid JSON, no markdown formatting.`;
}

export function parseCaseSummaryResponse(
  response: string,
  note: DBNote,
  similarity: number
): SimilarCaseSummary {
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    noteId: note.id,
    noteType: note.type,
    patientMrn: note.patient_mrn,
    similarity,
    createdAt: note.created_at,
    presentation: parsed.presentation || '',
    keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [],
    workupPerformed: Array.isArray(parsed.workupPerformed) ? parsed.workupPerformed : [],
    outcome: parsed.outcome || undefined,
    lessonsLearned: Array.isArray(parsed.lessonsLearned) ? parsed.lessonsLearned : undefined,
  };
}

export const CROSS_CASE_SYNTHESIS_SYSTEM_PROMPT = `You are a clinical informatics specialist synthesizing insights across multiple similar cases.

Analyze patterns, common approaches, and lessons learned to provide actionable insights for the current case.`;

export function buildCrossCaseSynthesisPrompt(cases: SimilarCaseSummary[]): string {
  const caseSummaries = cases
    .map((c, i) => `Case ${i + 1} (${(c.similarity * 100).toFixed(0)}% similar):
- Presentation: ${c.presentation}
- Key Findings: ${c.keyFindings.join(', ')}
- Workup: ${c.workupPerformed.join(', ')}
- Outcome: ${c.outcome || 'Not recorded'}
- Lessons: ${c.lessonsLearned?.join(', ') || 'None recorded'}`)
    .join('\n\n');

  return `Synthesize insights from these similar cases:

${caseSummaries}

Provide synthesized insights as JSON:
{
  "commonPatterns": ["Patterns that appear across multiple cases"],
  "typicalWorkup": ["Standard workup elements for this type of presentation"],
  "pitfalls": ["Common pitfalls or mistakes to avoid based on these cases"]
}

Return ONLY valid JSON, no markdown formatting.`;
}

export function parseCrossCaseSynthesisResponse(
  response: string,
  cases: SimilarCaseSummary[]
): SimilarCasesOutput {
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    cases,
    synthesizedInsights: {
      commonPatterns: Array.isArray(parsed.commonPatterns) ? parsed.commonPatterns : [],
      typicalWorkup: Array.isArray(parsed.typicalWorkup) ? parsed.typicalWorkup : [],
      pitfalls: Array.isArray(parsed.pitfalls) ? parsed.pitfalls : [],
    },
    generatedAt: new Date().toISOString(),
  };
}
