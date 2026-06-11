export enum InputEventType { On = 'on', Off = 'off' }
export interface InputEvent { note: number; type: InputEventType; time: number; velocity?: number }
