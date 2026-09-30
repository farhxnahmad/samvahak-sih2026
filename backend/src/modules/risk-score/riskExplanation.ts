import { RiskCategory } from "../../constants/enums";
import { IRiskInputs } from "./riskScore.model";

/**
 * Rule-based natural-language explanation - no external AI API, so it works fully offline
 * and deterministically for a demo. Picks the 1-2 biggest contributing factors and names them,
 * e.g. "Tawang risk increased due to heavy rainfall and multiple road blockage reports."
 */

const HIGH_THRESHOLD = 60;
const MODERATE_THRESHOLD = 35;

interface Factor {
  phrase: string;
  weight: number; // used only to pick the top factors, not shown to the user
}

function buildFactors(inputs: IRiskInputs): Factor[] {
  const factors: Factor[] = [];

  if (inputs.weatherSeverityScore >= HIGH_THRESHOLD) {
    factors.push({ phrase: "heavy rainfall", weight: inputs.weatherSeverityScore });
  } else if (inputs.weatherSeverityScore >= MODERATE_THRESHOLD) {
    factors.push({ phrase: "unsettled weather", weight: inputs.weatherSeverityScore });
  }

  if (inputs.incidentCount >= 5) {
    factors.push({ phrase: "multiple road blockage reports", weight: inputs.incidentCount * 10 });
  } else if (inputs.incidentCount >= 2) {
    factors.push({ phrase: "a rise in reported incidents", weight: inputs.incidentCount * 10 });
  }

  if (inputs.incidentSeverityScore >= HIGH_THRESHOLD) {
    factors.push({ phrase: "several high-severity incidents", weight: inputs.incidentSeverityScore });
  }

  if (inputs.routeConditionScore >= HIGH_THRESHOLD) {
    factors.push({ phrase: "significant route disruption", weight: inputs.routeConditionScore });
  } else if (inputs.routeConditionScore >= MODERATE_THRESHOLD) {
    factors.push({ phrase: "partial route disruption", weight: inputs.routeConditionScore });
  }

  return factors.sort((a, b) => b.weight - a.weight);
}

function joinFactors(phrases: string[]): string {
  if (phrases.length === 0) return "no single dominant factor";
  if (phrases.length === 1) return phrases[0];
  return `${phrases.slice(0, -1).join(", ")} and ${phrases[phrases.length - 1]}`;
}

/**
 * @param districtName  e.g. "Tawang"
 * @param previousScore last computed score for this district/hazardType, if any
 */
export function generateExplanation(
  districtName: string,
  inputs: IRiskInputs,
  score: number,
  category: RiskCategory,
  previousScore?: number
): string {
  const topFactors = buildFactors(inputs).slice(0, 2).map((f) => f.phrase);
  const factorText = joinFactors(topFactors);

  let trend = "is being assessed";
  if (previousScore !== undefined) {
    const delta = score - previousScore;
    if (delta >= 5) trend = "increased";
    else if (delta <= -5) trend = "decreased";
    else trend = "remains stable";
  }

  if (trend === "is being assessed") {
    return `${districtName} risk is ${category} (score ${score}/100), driven by ${factorText}.`;
  }
  if (trend === "remains stable") {
    return `${districtName} risk remains stable at ${category} (score ${score}/100); ${factorText} continue to be the main factors.`;
  }
  return `${districtName} risk ${trend} to ${category} (score ${score}/100) due to ${factorText}.`;
}
