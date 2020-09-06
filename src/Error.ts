export default class CustomError extends Error {
    constructor(public name: string, message?: string) {
        super(message);
    }
}