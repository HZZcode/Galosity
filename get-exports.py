import os;
with open('./exports.txt', 'w+', encoding='utf-8') as out:
    s = '\n'.join('/'.join(path) + '/' + os.path.splitext(file)[0] for root, _, files in os.walk('./ts') for file in files if file.endswith(".ts") or file.endswith(".js") if len(path := root.split(os.sep)[1:]) != 0 and path[0] != 'main')
    print(s)
    print(s, file=out, end='')