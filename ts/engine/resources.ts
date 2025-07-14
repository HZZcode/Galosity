import { Files } from "../utils/files.js";
import { splitWith } from "../utils/split.js";

export class ResourceManager extends Files {
    parent = document.getElementById('images') as HTMLDivElement;
    constructor(filename = undefined) {
        super(filename);
    }
    getImageElements() {
        return [...this.parent.querySelectorAll('.image')] as HTMLDivElement[];
    }
    getElements() {
        return [...this.getImageElements(), this.getElement('background')] as HTMLDivElement[];
    }
    getElement(pos: string) {
        const element = document.getElementById(`${pos}-image`);
        return element === null ? undefined : element as HTMLDivElement;
    }

    async clear() {
        this.getImageElements().forEach(async (element) => await this.setElementImage(element, 'clear'));
        await this.setImage('background', 'clear');
    }

    defImagePos(pos: string, left: string, bottom: string) {
        const id = `${pos}-image`;
        const setPos = (element?: HTMLDivElement) => {
            if (element === undefined) return;
            if (left !== '') element.style.left = left;
            if (bottom !== '') element.style.bottom = bottom;
        };
        if (this.getElements().some(element => element.id === id)) {
            setPos(this.getElement(pos));
            return;
        }
        const element = document.createElement('div');
        element.className = 'image';
        element.id = id;
        setPos(element);
        this.parent.appendChild(element);
    }

    setElementBackground(element: HTMLDivElement | undefined, background: string) {
        if (element === undefined || element.style === undefined) return;
        element.style.backgroundImage = background;
    }
    async setElementImage(element: HTMLDivElement | undefined, file: string) {
        this.setElementBackground(element, file !== 'clear' ? `url("${await this.getSource(file)}")` : '');
    }
    async setImage(pos: string, file: string) {
        if (file.trim().startsWith('@')) {
            file = file.replace('@', '');
            let left = file.trim();
            let bottom = '0';
            if (file.includes(',')) {
                [left, bottom] = splitWith(',')(file);
            }
            this.defImagePos(pos, left, bottom);
        }
        else await this.setElementImage(this.getElement(pos), file);
    }

    transformElement(element: HTMLDivElement | undefined, transform: string) {
        if (element === undefined || element.style === undefined) return;
        element.style.transform = transform.toString();
    }
    transformImage(pos: string, transform: string) {
        this.transformElement(this.getElement(pos), transform);
    }

    getPos(id: string) {
        return id.endsWith('-image') ? id.slice(0, -6) : '';
    }

    toString() {
        return [this.filename, this.getElements().map(element => [
            this.getPos(element.id),
            element.style.left,
            element.style.bottom,
            element.style.backgroundImage,
            element.style.transform
        ].join('|'))].join(';');
    }
    static fromString(str: string) {
        const manager = new ResourceManager();
        manager.clear();
        if (!str.includes(';')) return manager;
        const elements = str.split(';');
        manager.setFile(elements[0]);
        for (const element of elements.slice(1)) {
            const [pos, left, bottom, image, transform] = element.split('|');
            manager.defImagePos(pos, left, bottom);
            if (image !== '') manager.setElementBackground(manager.getElement(pos), image);
            manager.transformImage(pos, transform);
        }
        return manager;
    }
}
