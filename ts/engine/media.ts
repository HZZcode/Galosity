const mediaTypes: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'aac': 'audio/aac',
    'flac': 'audio/flac',
    'mid': 'audio/midi',
    'midi': 'audio/midi',
    'wma': 'audio/x-ms-wma',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogv': 'video/ogg',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'flv': 'video/x-flv',
    'mkv': 'video/x-matroska'
};

export interface MediaDataType {
    volume: number;
    pos: 'foreground' | 'background';
    block: boolean;
    resisting: boolean;
};

class MediaRecord {
    element?: HTMLMediaElement;
    ended = false;

    constructor(public source: string, public data: MediaDataType) { }

    get type() {
        return MediaRecord.typeOf(this.source);
    }

    get mediaType() {
        const type = this.type.split('/')[0];
        if (['audio', 'video'].includes(type)) return type as 'audio' | 'video';
        return undefined;
    }

    static typeOf(source: string) {
        const extension = source.split('.').pop()!.toLowerCase();
        if (extension in mediaTypes) return mediaTypes[extension];
        return '';
    }

    async play() {
        const mediaType = this.mediaType;
        if (mediaType === undefined) return;
        this.element = document.createElement(mediaType);
        this.element.controls = false;
        this.element.autoplay = true;
        this.element.className = `whole-screen ${this.data.pos}`;
        this.element.volume = this.data.volume;
        const source = document.createElement('source');
        source.src = this.source;
        source.type = this.type;
        this.element.appendChild(source);
        document.body.appendChild(this.element);
        this.element.addEventListener('ended', () => this.ended = true);
        await this.element.play();
    }

    clear() {
        this.element?.pause();
        this.element?.remove();
        this.ended = true;
        this.element = undefined;
    }
}

export class MediaManager {
    current?: MediaRecord;

    async play(source: string, data: MediaDataType) {
        this.current?.clear();
        await (this.current = new MediaRecord(source, data)).play();
    }

    clear() {
        this.current?.clear();
        this.current = undefined;
    }

    clearWeak() {
        if (!this.current?.data.resisting) this.clear();
    }

    isBlocked() {
        if (this.current === undefined) return false;
        return !this.current.ended && this.current.data.block;
    }
}