import os
import re
from typing import Iterable

type File = str
type Files = list[File]
type Lines = Iterable[str]
type Symbol = str

tab = '  '


def get_lines(filename: str) -> Lines:
    with open(filename, 'r', encoding='utf-8') as read:
        return read.readlines()


def get_dts_list() -> Files:
    dts_files = []
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.d.ts'):
                dts_files.append(os.path.join(root, file).replace('\\', '/'))
    return [file for file in dts_files if not file.startswith('./main')]


def trim_dts(file: File) -> File:
    return file[:-5]


def to_lower_iden(part: str) -> str:
    iden = to_single_iden(part)
    return iden[0].lower() + iden[1:]


def to_single_iden(part: str) -> str:
    return ''.join(s[0].upper() + s[1:] for s in part.split('-'))


def to_iden(file: File) -> str:
    parts = file.split('/')[1:]
    parts[-1] = trim_dts(parts[-1])
    return ''.join(to_single_iden(part) for part in parts)


def import_part(files: Files) -> Lines:
    return [f'import * as {to_iden(file)} from "{trim_dts(file)}";'
            for file in files if len(set(find_symbols(file))) != 0]


def find_symbols(file: File) -> Iterable[Symbol]:
    lines = get_lines(file)
    pattern = r'export (declare )?(abstract class|class|const|enum|function|let) (.*?)[^a-zA-Z]'
    for line in lines:
        match = re.search(pattern, line)
        if match:
            yield match.group(3)


def single_symbol_part(file: File) -> Lines:
    symbols = set(find_symbols(file))
    return [f'export import {symbol} = {to_iden(file)}.{symbol};' for symbol in symbols]


def symbol_part(files: Files) -> Lines:
    yield 'declare global {'
    yield tab + 'namespace galosity {'
    for file in files:
        parts = file.split('/')[1:]
        parts[-1] = trim_dts(parts[-1])
        depth = len(parts) + 1
        symbols = list(single_symbol_part(file))
        if len(symbols) == 0:
            continue
        for i, part in enumerate(parts):
            yield f'{tab * (i + 2)}namespace {to_lower_iden(part)} {{'
        for line in symbols:
            yield tab * (depth + 1) + line
        for i in range(depth, 1, -1):
            yield f'{tab * i}}}'
    yield tab + '}'
    yield '}'


def main() -> None:
    files = get_dts_list()
    with open('exports.d.ts', 'w+') as exports:
        print('\n'.join(import_part(files)), file=exports)
        print('\n'.join(symbol_part(files)), file=exports)


if __name__ == '__main__':
    main()
