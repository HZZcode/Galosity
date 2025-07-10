const enabled = galosity.utils.logger.logger.isDebug;

async function test(name) {
    const message = `${name} test`;
    galosity.utils.logger.logger.log(message);
    await galosity.electron.ipcRenderer.invoke('log', message);
}

class TestData extends galosity.parser.dataTypes.GalData {
    name;
    constructor(name) {
        super();
        this.name = name;
    }
}

export async function setup(info) {
    info.version.requires('2.1');
    galosity.utils.logger.logger.log(info);

    await test('plugin');

    if (enabled) {
        galosity.parser.parsers.Parsers.register(
            'Test', part => new TestData(part)
        );

        galosity.editor.tabCompleters.TabCompleters.register(
            galosity.editor.tabCompleters.TabCompleter.ofCombined(
                new galosity.editor.completer.AutoComplete(['Hi! This is Tester ZZ_404!']),
                context => context.data instanceof TestData ? context.data.name : undefined
            )
        );

        galosity.editor.jumpers.Jumpers.register(galosity.editor.jumpers.Jumper.of(
            TestData,
            _ => galosity.editor.jumpers.JumpResult.ofLink('https://github.com/HZZcode/Galosity')
        ));

        galosity.engine.processors.Processors.register(
            TestData,
            async (data, self) => {
                self.texts.outputText('Tester ZZ_404', `Plugin test! Data is '${data.name}'`, 'green');
                await test(data.name);
                return true;
            }
        );
    }

    return enabled;
}