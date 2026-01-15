import os
import re
from dataclasses import dataclass
from typing import Iterable

os.chdir('dts')

type Lines = Iterable[str]

tab = '  '

def get_lines(filename: str) -> Lines:
    with open(filename, 'r', encoding='utf-8') as read:
        return read.readlines()
    
def lower(name: str):
    return name[0].lower() + name[1:]

def to_iden(name: str):
    return ''.join(part[0].upper() + part[1:] for part in name.split('-'))

@dataclass
class Tree:
    name: str
    path: str
    children: list['Tree'] | None

    @classmethod
    def init(cls, path='.'):
        path = path.replace('\\', '/')
        name = os.path.basename(path)
        if os.path.isdir(path):
            children = [cls.init(os.path.join(path, entry)) for entry in os.listdir(path) if entry != 'main']
            return cls(name, path, children)
        return cls(name, path, None)
    
    @property
    def module_name(self):
        return ''.join(map(to_iden, self.path[2:-5].split('/')))
    
    @property
    def import_lines(self):
        if self.children is None:
            if len(set(self.symbols)) == 0: return
            yield f'import * as {self.module_name} from "{self.path[:-5]}";'
        else:
            for child in self.children:
                yield from child.import_lines
    
    @property
    def symbols(self):
        lines = get_lines(self.path)
        pattern = r'export (declare )?(abstract class|class|const|enum|function|let) (.*?)[^a-zA-Z]'
        for line in lines:
            match = re.search(pattern, line)
            if match:
                yield match.group(3)
    
    @property
    def symbol_lines(self):
        if self.children is None:
            if len(set(self.symbols)) == 0: return
            yield f'namespace {lower(to_iden(self.name[:-5]))} {{'
            for symbol in set(self.symbols):
                yield tab + f'export import {symbol} = {self.module_name}.{symbol};'
            yield '}'
        else:
            if len(self.children) == 0: return
            yield f'namespace {'galosity' if self.name == '.' else lower(to_iden(self.name))} {{'
            for child in self.children:
                for line in child.symbol_lines:
                    yield tab + line
            yield '}'

if __name__ == '__main__':
    tree = Tree.init()
    with open('exports.d.ts', 'w+') as exports:
        print('\n'.join(tree.import_lines), file=exports)
        print('declare global {', file=exports)
        print('\n'.join(tab + line for line in tree.symbol_lines), file=exports)
        print('}', file=exports)