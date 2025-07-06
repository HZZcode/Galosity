export class ErrorManager {
    errorElement;
    warnElement;
    constructor(errorElement: HTMLDivElement, warnElement?: HTMLDivElement) {
        this.errorElement = errorElement;
        this.warnElement = warnElement;
    }
    error(msg: any) {
        this.errorElement.innerText = msg.toString();
    }
    warn(msg: any) {
        if (this.warnElement !== undefined)
            this.warnElement.innerText = msg.toString();
    }
    clear() {
        this.error('');
        this.warn('');
    }
}