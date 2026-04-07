export const GUIDELINES = [
    'Concatenation is automatic: type ab and it is read as a.b. You can also use . explicitly.',
    'Union (Or): Represented by | (e.g., a|b means either a or b).',
    'Kleene Star: Represented by * (e.g., a* means zero or more occurrences of a).',
    'Epsilon: Use e in regex to represent the empty string (e.g., a.e.b is equivalent to a.b).',
    'Custom Alphabet: Change the alphabet in the side panel (e.g., 0,1 or x,y).',
    'When checking a string, enter only alphabet symbols and e (empty string).',
    'Use the q-notation toggle to display states as q1, q2, q3, etc.',
    'Use the double ring toggle to show accepting states with a double circle border.',
    'Click an edge to delete it, or tap two nodes to add a new transition.',
    'Use the minimize button to reduce states via the Table-Filling Method.',
    'Constraint mode: Build DFAs from rules like contains(ab), !contains(b), equals(aa), startsWith(a), endsWith(b).',
    'Combine constraints with && (and) or || (or). Example: !contains(bb) && endsWith(a).',
];
