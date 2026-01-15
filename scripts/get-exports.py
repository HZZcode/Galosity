import os;

with open('./exports.txt', 'w+', encoding='utf-8') as out:
    for root, _, files in os.walk('./ts'):
        for file in files:
            if (len(path := root.split(os.sep)[1:]) != 0 and path[0] != 'main'
                and file.endswith(".ts") or file.endswith(".js")):
                export = '/'.join(path) + '/' + os.path.splitext(file)[0]
                print(export, file=out)