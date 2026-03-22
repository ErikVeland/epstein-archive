import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 1. Catch blocks
    content = re.sub(r'catch\s*\(\s*([a-zA-Z0-9_]+)\s*:\s*any\s*\)', r'catch (\1)', content)

    # 2. Function generic assertions on e.g onChange
    content = re.sub(r'onChange=\{\(e: any\) =>', r'onChange={(e: React.ChangeEvent<any>) =>', content) # temporary step, eventually we'll fix the inner any

    # 3. Use state generic explicit
    # Skip for now without AST, too complex for simple regex.

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    modified = 0
    client_dir = 'src/client'
    for root, dirs, files in os.walk(client_dir):
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, file)
                if process_file(filepath):
                    modified += 1
                    print(f"Modified: {filepath}")
    
    print(f"Total files modified: {modified}")

if __name__ == '__main__':
    main()
