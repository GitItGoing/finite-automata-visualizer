import React, { useState } from 'react';
import { CSSTransition } from 'react-transition-group';
import { LEGEND } from '../constants/legend';
import Link from 'next/link';
import { regexToDFAJSON, regexToNFAJSON } from '../utils/jsonExamples';

interface PropsInterface {
    show: boolean;
    alphabet?: string[];
}

function CollapsibleSection({
    title,
    children,
    defaultOpen = false,
}: {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-gray-200 last:border-b-0">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between py-2 text-sky-500 text-sm font-medium hover:text-sky-600 transition"
            >
                <span>{title}</span>
                <span
                    className="transition-transform duration-200"
                    style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                    &#9654;
                </span>
            </button>
            {open && (
                <div className="pb-3 text-gray-500 text-xs leading-relaxed flex flex-col gap-1.5">
                    {children}
                </div>
            )}
        </div>
    );
}

function LegendPanel(props: PropsInterface) {
    const { show, alphabet = ['a', 'b'] } = props;
    return (
        <div className="legend-panel">
            <CSSTransition
                in={show}
                timeout={300}
                classNames="slide"
                unmountOnExit
            >
                <div
                    id="info-panel"
                    className="flex flex-col overflow-y-auto gap-3 absolute top-0 right-0 py-2 px-3 rounded-md w-[20rem] h-full bg-gray-50 z-10"
                >
                    {/* Header */}
                    <div className="flex flex-col justify-center w-full gap-2 mt-10 px-4">
                        <h2 className="text-gray-500 text-sm">
                            &Sigma; = &#x2774; {alphabet.join(', ')} &#x2775; &nbsp; &epsilon; = e
                        </h2>
                        {LEGEND.map((content, index) => (
                            <div
                                className="flex flex-1 items-center w-full justify-center"
                                key={index}
                            >
                                <div
                                    className={`size-[2rem] w-[10%] flex items-center justify-center text-center ${content.bgClass} ${content.borderClass} border-2`}
                                >
                                    {content.description}
                                </div>
                                <h1 className="text-sm w-[90%] text-gray-500 pl-2">
                                    {content.title}
                                </h1>
                            </div>
                        ))}
                    </div>

                    {/* Collapsible sections */}
                    <div className="grow flex flex-col px-4">
                        <CollapsibleSection title="Regex" defaultOpen={true}>
                            <p>Concatenation is automatic: type <code className="bg-gray-200 px-1 rounded">ab</code> and it is read as <code className="bg-gray-200 px-1 rounded">a.b</code>.</p>
                            <p>Union: <code className="bg-gray-200 px-1 rounded">a|b</code> means either a or b.</p>
                            <p>Kleene Star: <code className="bg-gray-200 px-1 rounded">a*</code> means zero or more a's.</p>
                            <p>Epsilon: Use <code className="bg-gray-200 px-1 rounded">e</code> anywhere to mean the empty string (e.g., <code className="bg-gray-200 px-1 rounded">a|e</code> matches "a" or "").</p>
                            <p>The alphabet is auto-inferred from your regex — no need to set it manually.</p>
                            <p>Example: <code className="bg-gray-200 px-1 rounded">ab*|ba</code></p>
                            <p className="mt-2 pt-2 border-t border-gray-200">
                                <strong>DFA vs NFA:</strong> The same regex can be plotted two ways:
                            </p>
                            <p>• <strong>Regex tab</strong> → direct <strong>DFA</strong> via Brzozowski's algorithm (minimal-ish, no ε-edges)</p>
                            <p>• <strong>NFA tab</strong> → <strong>NFA</strong> via Thompson's construction (has ε-edges, often more states)</p>
                            <p>Use the NFA tab to see the classic textbook NFA structure with ε-transitions, then click <strong>NFA → DFA</strong> in the toolbar to run subset construction. The standard pipeline: <code className="bg-gray-200 px-1 rounded">regex → NFA → DFA → minimize</code>.</p>
                        </CollapsibleSection>

                        <CollapsibleSection title="Regex Examples">
                            <p className="italic">Tap an example to try it:</p>
                            <p className="text-gray-400 text-[0.65rem] mt-2 mb-1 font-semibold">BASIC PATTERNS</p>
                            <div className="flex flex-col gap-2">
                                {[
                                    { desc: 'Contains at least three 1s', re: '(0|1)*1(0|1)*1(0|1)*1(0|1)*' },
                                    { desc: 'Length ≥ 3 and third symbol is 0', re: '(0|1)(0|1)0(0|1)*' },
                                    { desc: 'Ends with b', re: '(a|b)*b' },
                                    { desc: 'Starts with a', re: 'a(a|b)*' },
                                    { desc: 'Contains substring "ab"', re: '(a|b)*ab(a|b)*' },
                                    { desc: 'Exactly 3 symbols long', re: '(a|b)(a|b)(a|b)' },
                                    { desc: 'Zero or more a\'s then a b', re: 'a*b' },
                                    { desc: 'Even number of 0s', re: '(1|01*0)*' },
                                    { desc: 'Empty string or a single a (uses e)', re: 'e|a' },
                                    { desc: 'Optional a, then b (a? via e|a)', re: '(e|a)b' },
                                    { desc: 'Optional prefix "ab", then c*', re: '(ab|e)c*' },
                                    { desc: 'At most one a, any number of b\'s', re: 'b*(a|e)b*' },
                                    { desc: 'Optional leading zero, then 1s', re: '(0|e)1*' },
                                ].map((ex, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            const regexBtn = document.getElementById('regex-mode-button');
                                            if (regexBtn) regexBtn.click();
                                            setTimeout(() => {
                                                const input = document.querySelector(
                                                    '#regex-input'
                                                ) as HTMLInputElement | null;
                                                if (input) {
                                                    const setter = Object.getOwnPropertyDescriptor(
                                                        window.HTMLInputElement.prototype,
                                                        'value'
                                                    )?.set;
                                                    setter?.call(input, ex.re);
                                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                                    input.focus();
                                                }
                                            }, 50);
                                        }}
                                        className="text-left bg-white hover:bg-sky-50 border border-gray-200 rounded p-2 transition"
                                    >
                                        <div className="text-gray-600 text-xs">{ex.desc}</div>
                                        <code className="text-sky-600 text-xs block mt-0.5">{ex.re}</code>
                                    </button>
                                ))}
                            </div>
                            <p className="text-gray-400 text-[0.65rem] mt-4 mb-1 font-semibold">SIPSER HW #2 (BINARY ALPHABET)</p>
                            <div className="flex flex-col gap-2">
                                {[
                                    { desc: '1a. The language {0}', re: '0' },
                                    { desc: '1b. Strings ending in 00', re: '(0|1)*00' },
                                    { desc: '2a. Starts with 1 and ends with 0, or has ≥3 ones', re: '1(0|1)*0|(0|1)*1(0|1)*1(0|1)*1(0|1)*' },
                                    { desc: '2a (part 1). Starts with 1 and ends with 0', re: '1(0|1)*0' },
                                    { desc: '2a (part 2). Contains at least three 1s', re: '(0|1)*1(0|1)*1(0|1)*1(0|1)*' },
                                    { desc: '2b (part 1). Contains substring 1010', re: '(0|1)*1010(0|1)*' },
                                    { desc: '2b (part 2). Does not contain substring 110', re: '(0|10)*1*' },
                                    { desc: '3. Even 0s, odd 1s, no "01" substring', re: '1(11)*(00)*' },
                                    { desc: '4. No pair of 1s separated by odd # symbols', re: '0*|0*10*|(00)*1(00)*10*|0(00)*1(00)*10*' },
                                    { desc: '5 (n=2). Only 1s, even length', re: '(11)*' },
                                    { desc: '5 (n=3). Only 1s, length multiple of 3', re: '(111)*' },
                                    { desc: '6. Equal count of "01" and "10" substrings', re: 'e|0|1|0(0|1)*0|1(0|1)*1' },
                                    { desc: '7a. Strings starting with a (NFA→DFA)', re: 'a(a|b)*' },
                                    { desc: '7b. Empty or starts with a (NFA→DFA)', re: 'e|a(a|b)*' },
                                    { desc: 'Bonus. No consecutive 1s (no "11")', re: '(0|10)*(e|1)' },
                                    { desc: 'Ends with 010', re: '(0|1)*010' },
                                    { desc: 'Starts with 00 or ends with 11', re: '00(0|1)*|(0|1)*11' },
                                    { desc: 'Contains 000 and ends with 1', re: '(0|1)*000(0|1)*1' },
                                    { desc: 'Even length (any binary string)', re: '((0|1)(0|1))*' },
                                    { desc: 'Odd length (any binary string)', re: '(0|1)((0|1)(0|1))*' },
                                ].map((ex, i) => (
                                    <button
                                        key={`sipser-${i}`}
                                        onClick={() => {
                                            const regexBtn = document.getElementById('regex-mode-button');
                                            if (regexBtn) regexBtn.click();
                                            setTimeout(() => {
                                                const input = document.querySelector(
                                                    '#regex-input'
                                                ) as HTMLInputElement | null;
                                                if (input) {
                                                    const setter = Object.getOwnPropertyDescriptor(
                                                        window.HTMLInputElement.prototype,
                                                        'value'
                                                    )?.set;
                                                    setter?.call(input, ex.re);
                                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                                    input.focus();
                                                }
                                            }, 50);
                                        }}
                                        className="text-left bg-white hover:bg-sky-50 border border-gray-200 rounded p-2 transition"
                                    >
                                        <div className="text-gray-600 text-xs">{ex.desc}</div>
                                        <code className="text-sky-600 text-xs block mt-0.5">{ex.re}</code>
                                    </button>
                                ))}
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="NFA Examples">
                            <p className="italic">Tap an example to build the NFA from a regex via Thompson's construction.</p>
                            <p className="text-gray-500">After the NFA is drawn, click <strong>NFA → DFA</strong> in the toolbar to convert via subset construction.</p>
                            <p className="text-gray-400 text-[0.65rem] mt-2 mb-1 font-semibold">CLASSIC THOMPSON PATTERNS</p>
                            <div className="flex flex-col gap-2">
                                {[
                                    { desc: 'Simple union (2 ε-branches from start)', re: 'a|b' },
                                    { desc: 'Kleene star (4 ε-edges: bypass + loop)', re: 'a*' },
                                    { desc: 'Optional \'a\' then \'b\' (uses e|a for optionality)', re: '(e|a)b' },
                                    { desc: 'Concatenation chain', re: 'abc' },
                                    { desc: 'Nested kleene (showcase ε-complexity)', re: '(ab)*' },
                                ].map((ex, i) => (
                                    <button
                                        key={`nfa-classic-${i}`}
                                        onClick={() => {
                                            // Switch to NFA tab first
                                            const nfaBtn = document.getElementById('nfa-mode-button');
                                            if (nfaBtn) nfaBtn.click();
                                            setTimeout(() => {
                                                const input = document.querySelector(
                                                    '#regex-input'
                                                ) as HTMLInputElement | null;
                                                if (input) {
                                                    const setter = Object.getOwnPropertyDescriptor(
                                                        window.HTMLInputElement.prototype,
                                                        'value'
                                                    )?.set;
                                                    setter?.call(input, ex.re);
                                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                                    input.focus();
                                                }
                                            }, 50);
                                        }}
                                        className="text-left bg-white hover:bg-amber-50 border border-gray-200 rounded p-2 transition"
                                    >
                                        <div className="text-gray-600 text-xs">{ex.desc}</div>
                                        <code className="text-amber-600 text-xs block mt-0.5">{ex.re}</code>
                                    </button>
                                ))}
                            </div>
                            <p className="text-gray-400 text-[0.65rem] mt-4 mb-1 font-semibold">SIPSER HW #2 AS NFA</p>
                            <div className="flex flex-col gap-2">
                                {[
                                    { desc: '1a. The language {0}', re: '0' },
                                    { desc: '1b. Strings ending in 00', re: '(0|1)*00' },
                                    { desc: '2a. Starts with 1 & ends with 0, OR ≥3 ones', re: '1(0|1)*0|(0|1)*1(0|1)*1(0|1)*1(0|1)*' },
                                    { desc: '7a. Strings starting with \'a\'', re: 'a(a|b)*' },
                                    { desc: '7b. Empty or starts with \'a\'', re: 'e|a(a|b)*' },
                                    { desc: 'Ends with 010', re: '(0|1)*010' },
                                ].map((ex, i) => (
                                    <button
                                        key={`nfa-hw-${i}`}
                                        onClick={() => {
                                            const nfaBtn = document.getElementById('nfa-mode-button');
                                            if (nfaBtn) nfaBtn.click();
                                            setTimeout(() => {
                                                const input = document.querySelector(
                                                    '#regex-input'
                                                ) as HTMLInputElement | null;
                                                if (input) {
                                                    const setter = Object.getOwnPropertyDescriptor(
                                                        window.HTMLInputElement.prototype,
                                                        'value'
                                                    )?.set;
                                                    setter?.call(input, ex.re);
                                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                                    input.focus();
                                                }
                                            }, 50);
                                        }}
                                        className="text-left bg-white hover:bg-amber-50 border border-gray-200 rounded p-2 transition"
                                    >
                                        <div className="text-gray-600 text-xs">{ex.desc}</div>
                                        <code className="text-amber-600 text-xs block mt-0.5">{ex.re}</code>
                                    </button>
                                ))}
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Constraint Language">
                            <p>Build DFAs from natural rules instead of regex.</p>
                            <p><code className="bg-gray-200 px-1 rounded">contains(ab)</code> — strings containing "ab"</p>
                            <p><code className="bg-gray-200 px-1 rounded">!contains(bb)</code> — no consecutive b's</p>
                            <p><code className="bg-gray-200 px-1 rounded">equals(aba)</code> — only the string "aba"</p>
                            <p><code className="bg-gray-200 px-1 rounded">startsWith(a)</code> — starts with a</p>
                            <p><code className="bg-gray-200 px-1 rounded">endsWith(b)</code> — ends with b</p>
                            <p>Combine with <code className="bg-gray-200 px-1 rounded">&&</code> (and) or <code className="bg-gray-200 px-1 rounded">||</code> (or).</p>
                            <p>Example: <code className="bg-gray-200 px-1 rounded">!contains(bb) && endsWith(a)</code></p>
                        </CollapsibleSection>

                        <CollapsibleSection title="JSON Import / Export">
                            <p>Import a DFA or NFA by pasting JSON into the JSON tab or uploading a <code className="bg-gray-200 px-1 rounded">.json</code> file. Export the current automaton via the <strong>export</strong> button in the toolbar.</p>

                            <p className="mt-3"><strong>Plain-English definition of the JSON format:</strong></p>

                            <p className="mt-2">1. <strong>The type</strong> is either <code className="bg-gray-200 px-1 rounded">"DFA"</code> or <code className="bg-gray-200 px-1 rounded">"NFA"</code>. Set the <code className="bg-gray-200 px-1 rounded">type</code> field to <code className="bg-gray-200 px-1 rounded">"NFA"</code> for an NFA. Omitting the field (or any other value) means DFA.</p>

                            <p className="mt-2">2. <strong>The alphabet</strong> is an array of single-character strings, one per symbol. Example: <code className="bg-gray-200 px-1 rounded">"alphabet": ["0","1"]</code> or <code className="bg-gray-200 px-1 rounded">["a","b"]</code>.</p>

                            <p className="mt-2">3. <strong>The states</strong> are an array of state names you invent. They can be anything, but by convention people use <code className="bg-gray-200 px-1 rounded">q0</code>, <code className="bg-gray-200 px-1 rounded">q1</code>, etc. Example: <code className="bg-gray-200 px-1 rounded">"states": ["q1","q2","q3"]</code>.</p>

                            <p className="mt-2">4. <strong>The start state</strong> is declared by naming one of your states in the <code className="bg-gray-200 px-1 rounded">start</code> field. Example: <code className="bg-gray-200 px-1 rounded">"start": "q1"</code>. Only one start state is allowed, and it must appear in the <code className="bg-gray-200 px-1 rounded">states</code> array.</p>

                            <p className="mt-2">5. <strong>The accepting states</strong> are declared as an array in the <code className="bg-gray-200 px-1 rounded">accept</code> field. Example: <code className="bg-gray-200 px-1 rounded">"accept": ["q2","q3"]</code>. You can have zero, one, or many accepting states. A state can be both the start state AND accepting.</p>

                            <p className="mt-2">6. <strong>A transition</strong> describes where a state goes when it reads a symbol. Transitions live in the <code className="bg-gray-200 px-1 rounded">transitions</code> field, grouped by source state:</p>
                            <p className="ml-3">For <strong>DFA</strong>: each symbol maps to exactly one target state (single string).</p>
                            <pre className="bg-gray-200 rounded p-2 text-[0.65rem] overflow-x-auto whitespace-pre ml-3">{`"q1": { "a": "q2", "b": "q1" }
// Reads: "From q1, on 'a' go to q2.
//         From q1, on 'b' go to q1."`}</pre>
                            <p className="ml-3 mt-2">For <strong>NFA</strong>: each symbol maps to an <em>array</em> of possible target states (nondeterminism).</p>
                            <pre className="bg-gray-200 rounded p-2 text-[0.65rem] overflow-x-auto whitespace-pre ml-3">{`"q0": { "a": ["q0","q1"], "ε": ["q2"] }
// Reads: "From q0, on 'a' go to q0 OR q1.
//         From q0, on ε go to q2."`}</pre>

                            <p className="mt-2">7. <strong>A self-loop</strong> is just a transition where the target is the same state as the source.</p>
                            <pre className="bg-gray-200 rounded p-2 text-[0.65rem] overflow-x-auto whitespace-pre">{`// DFA: q1 loops on 'a'
"q1": { "a": "q1", "b": "q2" }

// NFA: q1 loops on 'a' (target in array)
"q1": { "a": ["q1"], "b": ["q2"] }`}</pre>

                            <p className="mt-2">8. <strong>An epsilon transition</strong> (NFA only) is a move that consumes no input. Use the symbol <code className="bg-gray-200 px-1 rounded">"ε"</code> (the Greek letter) or the word <code className="bg-gray-200 px-1 rounded">"epsilon"</code> as the transition key.</p>

                            <p className="mt-2">9. <strong>A dead state</strong> is not a special kind of state — it's just any state that isn't accepting and whose only transitions loop back to itself. You don't need to declare it as "dead" anywhere.</p>

                            <p className="mt-2">10. <strong>Missing transitions</strong> in a DFA are treated as going to an implicit dead state. You don't need to list every symbol for every state if you just want the DFA to reject that input.</p>

                            <p className="mt-3"><strong>Full DFA example:</strong></p>
                            <pre className="bg-gray-200 rounded p-2 text-[0.65rem] overflow-x-auto whitespace-pre">{`{
  "alphabet": ["a","b"],
  "states": ["q1","q2"],
  "start": "q1",
  "accept": ["q2"],
  "transitions": {
    "q1": {"a":"q2","b":"q1"},
    "q2": {"a":"q1","b":"q2"}
  }
}`}</pre>

                            <p className="mt-2"><strong>Full NFA example with ε:</strong></p>
                            <pre className="bg-gray-200 rounded p-2 text-[0.65rem] overflow-x-auto whitespace-pre">{`{
  "type": "NFA",
  "alphabet": ["a","b"],
  "states": ["q0","q1","q2"],
  "start": "q0",
  "accept": ["q2"],
  "transitions": {
    "q0": {"a":["q0","q1"], "ε":["q2"]},
    "q1": {"b":["q2"]}
  }
}`}</pre>

                            <p className="mt-3 text-gray-400 text-[0.65rem]">On export, a <code className="bg-gray-200 px-1 rounded">description</code> field is added with plain-English lines like <em>"if a, goes to q2"</em> or <em>"if b, self-loops"</em>. This is human-readable only; the importer ignores it.</p>
                        </CollapsibleSection>

                        <CollapsibleSection title="JSON Examples">
                            <p className="italic">Tap an example to load its JSON into the JSON tab. These mirror the Regex Examples and NFA Examples but build the JSON directly so you can inspect/edit it.</p>

                            <p className="text-gray-400 text-[0.65rem] mt-2 mb-1 font-semibold">DFA JSON — BASIC PATTERNS</p>
                            <div className="flex flex-col gap-2">
                                {[
                                    { desc: 'Contains at least three 1s', re: '(0|1)*1(0|1)*1(0|1)*1(0|1)*' },
                                    { desc: 'Length ≥ 3 and third symbol is 0', re: '(0|1)(0|1)0(0|1)*' },
                                    { desc: 'Ends with b', re: '(a|b)*b' },
                                    { desc: 'Starts with a', re: 'a(a|b)*' },
                                    { desc: 'Contains substring "ab"', re: '(a|b)*ab(a|b)*' },
                                    { desc: 'Exactly 3 symbols long', re: '(a|b)(a|b)(a|b)' },
                                    { desc: 'Zero or more a\'s then a b', re: 'a*b' },
                                    { desc: 'Even number of 0s', re: '(1|01*0)*' },
                                    { desc: 'Empty string or a single a (uses e)', re: 'e|a' },
                                    { desc: 'Optional a, then b (a? via e|a)', re: '(e|a)b' },
                                    { desc: 'Optional prefix "ab", then c*', re: '(ab|e)c*' },
                                    { desc: 'At most one a, any number of b\'s', re: 'b*(a|e)b*' },
                                    { desc: 'Optional leading zero, then 1s', re: '(0|e)1*' },
                                ].map((ex, i) => (
                                    <button
                                        key={`dfa-json-basic-${i}`}
                                        onClick={() => {
                                            const jsonBtn = document.getElementById('json-mode-button');
                                            if (jsonBtn) jsonBtn.click();
                                            setTimeout(() => {
                                                const textarea = document.querySelector(
                                                    '#json-input'
                                                ) as HTMLTextAreaElement | null;
                                                if (textarea) {
                                                    const setter = Object.getOwnPropertyDescriptor(
                                                        window.HTMLTextAreaElement.prototype,
                                                        'value'
                                                    )?.set;
                                                    const json = regexToDFAJSON(ex.re);
                                                    setter?.call(textarea, json);
                                                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                                                    textarea.focus();
                                                }
                                            }, 50);
                                        }}
                                        className="text-left bg-white hover:bg-sky-50 border border-gray-200 rounded p-2 transition"
                                    >
                                        <div className="text-gray-600 text-xs">{ex.desc}</div>
                                        <code className="text-sky-600 text-xs block mt-0.5">{ex.re}</code>
                                    </button>
                                ))}
                            </div>

                            <p className="text-gray-400 text-[0.65rem] mt-4 mb-1 font-semibold">DFA JSON — SIPSER HW #2</p>
                            <div className="flex flex-col gap-2">
                                {[
                                    { desc: '1a. The language {0}', re: '0' },
                                    { desc: '1b. Strings ending in 00', re: '(0|1)*00' },
                                    { desc: '2a. Starts with 1 & ends with 0, OR ≥3 ones', re: '1(0|1)*0|(0|1)*1(0|1)*1(0|1)*1(0|1)*' },
                                    { desc: '2a (part 1). Starts with 1 and ends with 0', re: '1(0|1)*0' },
                                    { desc: '2a (part 2). Contains at least three 1s', re: '(0|1)*1(0|1)*1(0|1)*1(0|1)*' },
                                    { desc: '2b (part 1). Contains substring 1010', re: '(0|1)*1010(0|1)*' },
                                    { desc: '2b (part 2). Does not contain substring 110', re: '(0|10)*1*' },
                                    { desc: '3. Even 0s, odd 1s, no "01" substring', re: '1(11)*(00)*' },
                                    { desc: '4. No pair of 1s separated by odd # symbols', re: '0*|0*10*|(00)*1(00)*10*|0(00)*1(00)*10*' },
                                    { desc: '5 (n=2). Only 1s, even length', re: '(11)*' },
                                    { desc: '5 (n=3). Only 1s, length multiple of 3', re: '(111)*' },
                                    { desc: '6. Equal count of "01" and "10" substrings', re: 'e|0|1|0(0|1)*0|1(0|1)*1' },
                                    { desc: '7a. Strings starting with a (NFA→DFA)', re: 'a(a|b)*' },
                                    { desc: '7b. Empty or starts with a (NFA→DFA)', re: 'e|a(a|b)*' },
                                    { desc: 'Bonus. No consecutive 1s (no "11")', re: '(0|10)*(e|1)' },
                                    { desc: 'Ends with 010', re: '(0|1)*010' },
                                    { desc: 'Starts with 00 or ends with 11', re: '00(0|1)*|(0|1)*11' },
                                    { desc: 'Contains 000 and ends with 1', re: '(0|1)*000(0|1)*1' },
                                    { desc: 'Even length (any binary string)', re: '((0|1)(0|1))*' },
                                    { desc: 'Odd length (any binary string)', re: '(0|1)((0|1)(0|1))*' },
                                ].map((ex, i) => (
                                    <button
                                        key={`dfa-json-hw-${i}`}
                                        onClick={() => {
                                            const jsonBtn = document.getElementById('json-mode-button');
                                            if (jsonBtn) jsonBtn.click();
                                            setTimeout(() => {
                                                const textarea = document.querySelector(
                                                    '#json-input'
                                                ) as HTMLTextAreaElement | null;
                                                if (textarea) {
                                                    const setter = Object.getOwnPropertyDescriptor(
                                                        window.HTMLTextAreaElement.prototype,
                                                        'value'
                                                    )?.set;
                                                    const json = regexToDFAJSON(ex.re);
                                                    setter?.call(textarea, json);
                                                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                                                    textarea.focus();
                                                }
                                            }, 50);
                                        }}
                                        className="text-left bg-white hover:bg-sky-50 border border-gray-200 rounded p-2 transition"
                                    >
                                        <div className="text-gray-600 text-xs">{ex.desc}</div>
                                        <code className="text-sky-600 text-xs block mt-0.5">{ex.re}</code>
                                    </button>
                                ))}
                            </div>

                            <p className="text-gray-400 text-[0.65rem] mt-4 mb-1 font-semibold">NFA JSON — CLASSIC THOMPSON</p>
                            <div className="flex flex-col gap-2">
                                {[
                                    { desc: 'Simple union a|b', re: 'a|b' },
                                    { desc: 'Kleene star a*', re: 'a*' },
                                    { desc: 'Optional a then b', re: '(e|a)b' },
                                    { desc: 'Concatenation chain', re: 'abc' },
                                    { desc: 'Nested kleene (ab)*', re: '(ab)*' },
                                ].map((ex, i) => (
                                    <button
                                        key={`nfa-json-classic-${i}`}
                                        onClick={() => {
                                            const jsonBtn = document.getElementById('json-mode-button');
                                            if (jsonBtn) jsonBtn.click();
                                            setTimeout(() => {
                                                const textarea = document.querySelector(
                                                    '#json-input'
                                                ) as HTMLTextAreaElement | null;
                                                if (textarea) {
                                                    const setter = Object.getOwnPropertyDescriptor(
                                                        window.HTMLTextAreaElement.prototype,
                                                        'value'
                                                    )?.set;
                                                    const json = regexToNFAJSON(ex.re);
                                                    setter?.call(textarea, json);
                                                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                                                    textarea.focus();
                                                }
                                            }, 50);
                                        }}
                                        className="text-left bg-white hover:bg-amber-50 border border-gray-200 rounded p-2 transition"
                                    >
                                        <div className="text-gray-600 text-xs">{ex.desc}</div>
                                        <code className="text-amber-600 text-xs block mt-0.5">{ex.re}</code>
                                    </button>
                                ))}
                            </div>

                            <p className="text-gray-400 text-[0.65rem] mt-4 mb-1 font-semibold">NFA JSON — SIPSER HW #2</p>
                            <div className="flex flex-col gap-2">
                                {[
                                    { desc: '1a. The language {0}', re: '0' },
                                    { desc: '1b. Strings ending in 00', re: '(0|1)*00' },
                                    { desc: '2a. Starts 1 ends 0, OR ≥3 ones', re: '1(0|1)*0|(0|1)*1(0|1)*1(0|1)*1(0|1)*' },
                                    { desc: '7a. Strings starting with a', re: 'a(a|b)*' },
                                    { desc: '7b. Empty or starts with a', re: 'e|a(a|b)*' },
                                    { desc: 'Ends with 010', re: '(0|1)*010' },
                                ].map((ex, i) => (
                                    <button
                                        key={`nfa-json-hw-${i}`}
                                        onClick={() => {
                                            const jsonBtn = document.getElementById('json-mode-button');
                                            if (jsonBtn) jsonBtn.click();
                                            setTimeout(() => {
                                                const textarea = document.querySelector(
                                                    '#json-input'
                                                ) as HTMLTextAreaElement | null;
                                                if (textarea) {
                                                    const setter = Object.getOwnPropertyDescriptor(
                                                        window.HTMLTextAreaElement.prototype,
                                                        'value'
                                                    )?.set;
                                                    const json = regexToNFAJSON(ex.re);
                                                    setter?.call(textarea, json);
                                                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                                                    textarea.focus();
                                                }
                                            }, 50);
                                        }}
                                        className="text-left bg-white hover:bg-amber-50 border border-gray-200 rounded p-2 transition"
                                    >
                                        <div className="text-gray-600 text-xs">{ex.desc}</div>
                                        <code className="text-amber-600 text-xs block mt-0.5">{ex.re}</code>
                                    </button>
                                ))}
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="NFA Mode">
                            <p>Select the <strong>NFA</strong> tab in the side panel to build an NFA from a regex using Thompson's construction.</p>
                            <p>NFA features vs DFA:</p>
                            <p>- <strong>Epsilon transitions</strong> (ε) — moves without consuming input</p>
                            <p>- <strong>Multiple active states</strong> — animation highlights all current states simultaneously</p>
                            <p>- <strong>Nondeterminism</strong> — one symbol can lead to multiple states</p>
                            <p>Click <strong>NFA → DFA</strong> in the toolbar to convert via subset construction.</p>
                            <p>When adding arrows manually in NFA mode, ε is available as a transition symbol.</p>
                        </CollapsibleSection>

                        <CollapsibleSection title="Editing & Tools">
                            <p><strong>Click an edge</strong> to delete a transition.</p>
                            <p><strong>Tap two nodes</strong> to add a new transition (or tap one twice for a self-loop).</p>
                            <p><strong>Minimize</strong> reduces states using the Table-Filling Method.</p>
                            <p><strong>Undo / Redo</strong> with Ctrl+Z / Ctrl+Shift+Z or toolbar buttons.</p>
                        </CollapsibleSection>

                        <CollapsibleSection title="Display Settings">
                            <p><strong>q-notation</strong> — show states as q1, q2, q3.</p>
                            <p><strong>Double ring</strong> — accepting states use double circle border.</p>
                            <p><strong>Dark mode</strong> — inverts all colors.</p>
                        </CollapsibleSection>

                        <CollapsibleSection title="String Checking">
                            <p>Enter a string in the bottom bar and press <strong>Animate</strong>.</p>
                            <p>Only alphabet symbols and <code className="bg-gray-200 px-1 rounded">e</code> (empty string) are accepted.</p>
                            <p>Adjust speed with the 1X–5X button.</p>
                        </CollapsibleSection>
                    </div>

                    {/* Footer */}
                    <div className="text-black px-4 pb-4">
                        <Link
                            href="https://github.com/maxellmilay/finite-automata-visualizer"
                            className="relative flex gap-5 mb-2"
                            target="_blank"
                        >
                            <i
                                className={`bx bxl-github text-sky-500 z-1 hover:scale-125 transition-all text-[2.5rem] peer`}
                            ></i>
                            <div className="items-center justify-center transition-all peer-hover:flex hidden">
                                <p className="text-white opacity-50 flex h-[1.8rem] items-center peer-hover justify-center text-[0.7rem] rounded-md border-1 bg-sky-500 w-[6rem]">
                                    Visit our Repo
                                </p>
                            </div>
                        </Link>
                        <div className="text-gray text-sky-500 text-md">
                            Contributors
                        </div>
                        <div className="flex flex-col text-sm text-gray-500 gap-1 mt-1">
                            <Link
                                href="https://maxell-milay.vercel.app/"
                                className="z-0 hover:scale-105 transition-all"
                                target="_blank"
                            >
                                Maxell Milay
                            </Link>
                            <Link
                                href="https://sheldonsagrado.vercel.app/"
                                className="hover:scale-105 transition-all"
                                target="_blank"
                            >
                                Sheldon Arthur
                            </Link>
                            <Link
                                href="https://jourdancatarina.vercel.app/"
                                className="hover:scale-105 transition-all"
                                target="_blank"
                            >
                                Jourdan Catarina
                            </Link>
                            <Link
                                href="https://jed-donaire.vercel.app/"
                                className="hover:scale-105 transition-all"
                                target="_blank"
                            >
                                Jed Edison
                            </Link>
                        </div>
                    </div>
                </div>
            </CSSTransition>
        </div>
    );
}

export default LegendPanel;
