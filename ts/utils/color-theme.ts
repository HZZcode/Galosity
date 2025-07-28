export class ColorTheme {
    constructor(
        public background: string,
        public mainColors: [string, string, string, string], //format: #RRGGBB
        public alpha: string, //format: CC
        public shadow: string,
        public error: string,
        public warning: string,
        public outline: string,
        public func: string,
        public funcHover: string
    ) { }

    set() {
        const root = document.documentElement;
        root.style.setProperty('--page-background', this.background);
        for (const [i, color] of this.mainColors.entries()) {
            root.style.setProperty(`--color-${i + 1}`, color);
            root.style.setProperty(`--color-alpha-${i + 1}`, color + this.alpha);
        }
        root.style.setProperty('--error', this.error);
        root.style.setProperty('--warning', this.warning);
        root.style.setProperty('--outline', this.outline);
        root.style.setProperty('--function', this.func);
        root.style.setProperty('--function-hover', this.funcHover);
    }
}

class ColorThemes {
    current = 0;

    constructor(public themes: ColorTheme[]) { }

    set(index?: number) {
        if (index !== undefined) this.current = index;
        this.current %= this.themes.length;
        this.themes[this.current].set();
    }

    next() {
        this.current++;
        this.set();
    }
}

export const themes = new ColorThemes([
    new ColorTheme('#f4f4f9', ['#ffffff', '#cccccc', '#999999', '#333333'], 'cc',
        '#0000001a', 'red', 'orange', 'orange', 'blue', 'darkblue'),
    new ColorTheme('#0b0b06', ['#000000', '#333333', '#999999', '#cccccc'], 'cc',
        '#ffffff1a', 'red', 'orange', 'orange', 'lightgreen', 'green'),
]);