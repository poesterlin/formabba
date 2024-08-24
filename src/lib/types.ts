
export enum MessageType {
    System,
    Sender
}

export interface Sender {
    name: string,
    color: string,
    isMe: boolean,
    id: number,
}

export interface Message {
    type: MessageType,
    text: string,
    senderId: number,
    date: Date,
    id: number,
    ofSameTypeAsLast: boolean,
    ofSameTypeAsNext: boolean,
    isFirstOfTheDay: boolean,
}