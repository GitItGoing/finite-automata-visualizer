import { TokenType, Token } from '../interfaces/lexer';

const token = (value = '', type: TokenType): Token => {
    return { value, type };
};

export const tokenize = (string: string, alphabet?: string[]): Token[] => {
    const tokens = [] as Token[];
    const src = string.split('');

    // If alphabet is provided, those characters are symbols.
    // 'e' is epsilon only if it's NOT in the alphabet.
    const alphaSet = alphabet ? new Set(alphabet) : null;

    const isSymbol = (ch: string): boolean => {
        if (alphaSet) {
            return alphaSet.has(ch);
        }
        // Default: letters a-z (except 'e' which is epsilon)
        return ch.length === 1 && /[a-dA-Df-zF-Z]/i.test(ch);
    };

    const isEpsilon = (ch: string): boolean => {
        if (alphaSet) {
            return ch === 'e' && !alphaSet.has('e');
        }
        return ch === 'e';
    };

    while (src.length > 0) {
        if (src[0] == '(') {
            tokens.push(token(src.shift(), TokenType.OpenParen));
        } else if (src[0] == ')') {
            tokens.push(token(src.shift(), TokenType.CloseParen));
        } else if (src[0] == '|') {
            tokens.push(token(src.shift(), TokenType.Or));
        } else if (src[0] == '*') {
            tokens.push(token(src.shift(), TokenType.Kleene));
        } else if (src[0] == '.') {
            tokens.push(token(src.shift(), TokenType.Concat));
        } else if (src[0] == '#') {
            tokens.push(token(src.shift(), TokenType.EOL));
        } else if (isEpsilon(src[0])) {
            tokens.push(token(src.shift(), TokenType.Epsilon));
        } else if (isSymbol(src[0])) {
            tokens.push(token(src.shift(), TokenType.Symbol));
        } else {
            // Skip unknown characters
            src.shift();
        }
    }

    return tokens;
};
