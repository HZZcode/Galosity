export class ErrorManager {
    constructor(public errorElement: HTMLDivElement, public warnElement?: HTMLDivElement) { }
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