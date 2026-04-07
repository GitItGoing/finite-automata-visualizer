export const GUIDELINES = [
    'Concatenation: Represented by . (e.g., a.b means ab).',
    'Union (Or): Represented by | (e.g., a|b means either a or b).',
    'Kleene Star: Represented by * (e.g., a* means zero or more occurrences of a).',
    'Epsilon: Use e in regex to represent the empty string (e.g., a.e.b is equivalent to a.b).',
    'When checking a string, the DFA visualizer only accepts strings composed of a, b, and the empty string e.',
    'For instance, while a.b is valid for DFA generation, the string should be entered as ab for checking.',
    'Use the q-notation toggle to display states as q0, q1, q2, etc.',
    'Use the double ring toggle to show accepting states with a double circle border.',
];
