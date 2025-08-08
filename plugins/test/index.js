/// <reference path="../../dts/exports.d.ts" />
const enabled = galosity.utils.runtime.Runtime.configs.isDebug;

async function test(name) {
    const message = `${name} test`;
    galosity.utils.logger.logger.log(message);
    await galosity.utils.runtime.ipcRenderer.invoke('log', message);
}

class TestData extends galosity.parser.dataTypes.GalData {
    name;
    constructor(name) {
        super();
        this.name = name;
    }
}

/** @param {galosity.plugin.metaInfo.MetaInfo} info */
export async function setup(info) {
    info.version.atLeast('2.1');

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
            async (data, manager) => {
                manager.texts.outputSpeech('Tester ZZ_404', `Plugin test! Data is '${data.name}'`, 'green');
                await test(data.name);
                return true;
            }
        );
    }

    return enabled;
}