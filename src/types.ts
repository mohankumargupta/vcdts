

export interface WokwiSignal {
    signal_name: string,
    value: number
}

export interface WokwiSignals {
    timestamp: number,
    signals: WokwiSignal[]
}

export interface TransformedSignal {
    signal_name: string,
    value: number
}

export interface TransformedData {
    timestamp: number;
    signals: TransformedSignal[];
}