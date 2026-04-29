import os
import re

def fix_imports(root_dir):
    client_root = os.path.join(root_dir, 'src', 'client')
    
    for root, dirs, files in os.walk(client_root):
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, client_root)
                depth = len(rel_path.split(os.sep)) - 1
                
                with open(file_path, 'r') as f:
                    content = f.read()
                
                new_content = content
                # Replace ../../../ (depth levels) with @client/
                for d in range(depth, 1, -1):
                    prefix = '../' * d
                    new_content = new_content.replace(f"'{prefix}", f"'@client/")
                    new_content = new_content.replace(f'"{prefix}', f'"@client/')
                
                if new_content != content:
                    with open(file_path, 'w') as f:
                        f.write(new_content)
                    print(f"Fixed {file_path}")

fix_imports('/Users/veland/Downloads/Epstein Files/epstein-archive')
