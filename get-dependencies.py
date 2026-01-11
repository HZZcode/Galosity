import urllib.request
import zipfile
import os

os.chdir('dependencies')

def download(url: str, filename: str):
    print(f'Downloading {url} to {filename}')
    with urllib.request.urlopen(url) as response:
        data = response.read()
        with open(filename, 'wb') as file:
            file.write(data)

download('https://cdn.bootcdn.net/ajax/libs/core-js/3.45.1/minified.min.js', 'core.js')
download('https://github.com/mathjax/MathJax/archive/refs/tags/3.2.2.zip', 'mathjax.zip')
download('https://cdn.bootcdn.net/ajax/libs/lodash.js/4.17.21/lodash.min.js', 'lodash.js')
download('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js', 'highlight.js')
download('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/default.min.css', 'highlight.css')
download('https://use.fontawesome.com/releases/v6.4.0/fontawesome-free-6.4.0-web.zip', 'font-awesome.zip')

with zipfile.ZipFile('mathjax.zip', 'r') as zip_ref:
    zip_ref.extractall('.')

with zipfile.ZipFile('font-awesome.zip', 'r') as zip_ref:
    zip_ref.extractall('.')

for folder_name in os.listdir('.'):
    if folder_name.startswith('fontawesome-free-'):
        os.rename(folder_name, 'font-awesome')
    if folder_name.startswith('MathJax-'):
        os.rename(folder_name, 'mathjax')