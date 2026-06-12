// Detection → severity mapping (ARCHITECTURE.md §4).
// COCO-SSD predictions: [{ class, score, bbox:[x,y,w,h] }].

export const PERSON_CLASSES = ['person'];

export const ANIMAL_CLASSES = [
  'bird',
  'cat',
  'dog',
  'horse',
  'sheep',
  'cow',
  'elephant',
  'bear',
  'zebra',
  'giraffe',
];

export const SEVERITY_META = {
  RED: { label: 'Human detected', priority: 3 },
  YELLOW: { label: 'Animal / Bird detected', priority: 2 },
  GREEN: { label: 'All clear', priority: 1 },
};

/**
 * Derive alert severity from the highest-priority class above `threshold`.
 * @param {Array<{class:string, score:number}>} predictions
 * @param {number} [threshold=0.6]
 * @returns {{severity:'RED'|'YELLOW'|'GREEN', label:string, matched:string[]}}
 */
export function classifySeverity(predictions = [], threshold = 0.6) {
  const confident = predictions.filter((p) => p.score >= threshold);

  const persons = confident.filter((p) => PERSON_CLASSES.includes(p.class));
  if (persons.length > 0) {
    return {
      severity: 'RED',
      label: SEVERITY_META.RED.label,
      matched: dedupe(persons.map((p) => p.class)),
    };
  }

  const animals = confident.filter((p) => ANIMAL_CLASSES.includes(p.class));
  if (animals.length > 0) {
    return {
      severity: 'YELLOW',
      label: SEVERITY_META.YELLOW.label,
      matched: dedupe(animals.map((p) => p.class)),
    };
  }

  return { severity: 'GREEN', label: SEVERITY_META.GREEN.label, matched: [] };
}

function dedupe(arr) {
  return [...new Set(arr)];
}
