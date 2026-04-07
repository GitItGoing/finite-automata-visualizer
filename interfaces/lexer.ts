export enum TokenType {
    Symbol,
    Or,
    Kleene,
    Concat,
    OpenParen,
    CloseParen,
    EOL,
    Epsilon,
}

export interface Token {
    value: string;
    type: TokenType;
}
