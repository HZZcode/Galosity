export class ErrorManager {
    constructor(public errorElement: HTMLDivElement, public warnElement?: HTMLDivElement) { }

    fullString(msg: any): string {
        if (msg instanceof Error && msg.cause !== undefined)
            return `${msg}\nCaused by: ${this.fullString(msg.cause)}`;
        return msg.toString();
    }

    error(msg: any) {
        this.errorElement.innerText = this.fullString(msg);
    }
    warn(msg: any) {
        if (this.warnElement !== undefined)
            this.warnElement.innerText = this.fullString(msg);
    }
    clear() {
        this.error('');
        this.warn('');
    }
}