import type { ClinicalDataDumpInput, ClinicalSummaryOutput } from '../types';

export const CLINICAL_SUMMARY_SYSTEM_PROMPT = `You are an expert clinical data analyst helping hospitalists synthesize complex patient information.

Your job is to:
1. PARSE any clinical data format (labs, notes, vitals, medications, imaging reports)
2. IDENTIFY data types and extract structured information
3. SYNTHESIZE into a comprehensive clinical summary
4. GENERATE actionable next steps with clinical reasoning

You must handle:
- Copy-pasted lab results in various formats
- Medication lists (both structured and free-text)
- Vital sign trends
- Progress notes and H&Ps
- Imaging reports
- Mixed data dumps with multiple data types

Be thorough in parsing but concise in output. Prioritize safety-critical findings.`;

export function buildClinicalSummaryPrompt(input: ClinicalDataDumpInput): string {
  return `Parse and summarize this clinical data:

RAW DATA:
${input.rawData}

${input.dataHints?.length ? `DATA HINTS: ${input.dataHints.join(', ')}` : ''}
${input.patientContext ? `PATIENT CONTEXT: ${input.patientContext}` : ''}
${input.focusAreas?.length ? `FOCUS AREAS: ${input.focusAreas.join(', ')}` : ''}

Analyze this data and respond as JSON:
{
  "parsedDataTypes": {
    "types": ["labs", "vitals", "medications", "notes", "imaging", etc.],
    "confidence": "high|medium|low",
    "parseNotes": "Any issues or ambiguities in parsing"
  },
  "summary": {
    "oneLiner": "Brief clinical summary - what's the patient's story?",
    "activeProblems": [
      {
        "problem": "Problem name",
        "status": "stable|improving|worsening|new",
        "supportingData": ["Specific data points supporting this problem"]
      }
    ],
    "keyFindings": [
      {
        "category": "lab|vital|imaging|exam|other",
        "finding": "The finding",
        "significance": "critical|important|routine"
      }
    ]
  },
  "clinicalTrajectory": "improving|stable|worsening|unclear",
  "nextSteps": [
    {
      "category": "workup|treatment|consult|disposition|monitoring",
      "action": "What to do",
      "priority": "stat|urgent|routine",
      "rationale": "Why this is recommended"
    }
  ],
  "gapsIdentified": [
    {
      "gap": "What information is missing",
      "importance": "critical|important|helpful",
      "suggestion": "How to address this gap"
    }
  ],
  "safetyConsiderations": [
    "Safety-critical items to not miss"
  ]
}

Return ONLY valid JSON, no markdown formatting.`;
}

export function parseClinicalSummaryResponse(response: string): ClinicalSummaryOutput {
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    parsedDataTypes: {
      types: Array.isArray(parsed.parsedDataTypes?.types) ? parsed.parsedDataTypes.types : [],
      confidence: parsed.parsedDataTypes?.confidence || 'medium',
      parseNotes: parsed.parsedDataTypes?.parseNotes || '',
    },
    summary: {
      oneLiner: parsed.summary?.oneLiner || '',
      activeProblems: Array.isArray(parsed.summary?.activeProblems)
        ? parsed.summary.activeProblems.map((p: Record<string, unknown>) => ({
            problem: p.problem || '',
            status: p.status || 'stable',
            supportingData: Array.isArray(p.supportingData) ? p.supportingData : [],
          }))
        : [],
      keyFindings: Array.isArray(parsed.summary?.keyFindings)
        ? parsed.summary.keyFindings.map((f: Record<string, unknown>) => ({
            category: f.category || 'other',
            finding: f.finding || '',
            significance: f.significance || 'routine',
          }))
        : [],
    },
    clinicalTrajectory: parsed.clinicalTrajectory || 'unclear',
    nextSteps: Array.isArray(parsed.nextSteps)
      ? parsed.nextSteps.map((s: Record<string, unknown>) => ({
          category: s.category || 'workup',
          action: s.action || '',
          priority: s.priority || 'routine',
          rationale: s.rationale || '',
        }))
      : [],
    gapsIdentified: Array.isArray(parsed.gapsIdentified)
      ? parsed.gapsIdentified.map((g: Record<string, unknown>) => ({
          gap: g.gap || '',
          importance: g.importance || 'helpful',
          suggestion: g.suggestion || '',
        }))
      : [],
    safetyConsiderations: Array.isArray(parsed.safetyConsiderations) ? parsed.safetyConsiderations : [],
    generatedAt: new Date().toISOString(),
  };
}
