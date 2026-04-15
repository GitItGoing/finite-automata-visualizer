/**
 * Returns a consistent color for a given transition symbol.
 * Multi-symbol transitions (e.g. "a,b") use the color of the first symbol.
 */
const COLOR_PALETTE = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#6366f1', // indigo
    '#84cc16', // lime
];

export function getTransitionColor(transition: string, alphabet: string[]): string {
    // Use first symbol in a comma-separated list
    const firstSym = transition.split(',')[0];
    const idx = alphabet.indexOf(firstSym);
    if (idx === -1) return '#4a5568'; // fallback gray-slate
    return COLOR_PALETTE[idx % COLOR_PALETTE.length];
}
