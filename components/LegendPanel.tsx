import React, { useState } from 'react';
import { CSSTransition } from 'react-transition-group';
import { LEGEND } from '../constants/legend';
import Link from 'next/link';

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
                        </CollapsibleSection>

                        <CollapsibleSection title="Regex Examples">
                            <p className="italic">Tap an example to try it:</p>
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
                                            const input = document.querySelector(
                                                '#side-panel input[type="text"]'
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
                                        }}
                                        className="text-left bg-white hover:bg-sky-50 border border-gray-200 rounded p-2 transition"
                                    >
                                        <div className="text-gray-600 text-xs">{ex.desc}</div>
                                        <code className="text-sky-600 text-xs block mt-0.5">{ex.re}</code>
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
                            <p>Import a DFA by pasting JSON or uploading a <code className="bg-gray-200 px-1 rounded">.json</code> file.</p>
                            <p>Format:</p>
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
                            <p>Export the current DFA as JSON using the <strong>export</strong> button in the toolbar.</p>
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
