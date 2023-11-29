export interface WokwiSignal {
    signal_name: string,
    value: number
}

export interface WokwiSignals {
    timestamp: number,
    signals: WokwiSignal[]
}