import os
import re

def fix_imports_safely(root_dir):
    client_root = os.path.join(root_dir, 'src', 'client')
    server_root = os.path.join(root_dir, 'src', 'server')
    shared_root = os.path.join(root_dir, 'src', 'shared')
    
    aliases = {
        '@client': client_root,
        '@server': server_root,
        '@shared': shared_root
    }
    
    def resolve_path(current_file_dir, import_path):
        if import_path.startswith('.'):
            abs_path = os.path.abspath(os.path.join(current_file_dir, import_path))
            for alias, alias_path in aliases.items():
                if abs_path.startswith(alias_path):
                    rel = os.path.relpath(abs_path, alias_path)
                    if rel == '.':
                        return alias
                    return f"{alias}/{rel}"
        return None

    for root, dirs, files in os.walk(os.path.join(root_dir, 'src')):
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                file_path = os.path.join(root, file)
                current_dir = os.path.dirname(file_path)
                
                with open(file_path, 'r') as f:
                    lines = f.readlines()
                
                new_lines = []
                changed = False
                for line in lines:
                    # Match import ... from '...' or import '...'
                    match = re.search(r"(import|from)\s+['\"](\.\./\.\./[^'\"]+)['\"]", line)
                    if match:
                        import_path = match.group(2)
                        new_import = resolve_path(current_dir, import_path)
                        if new_import:
                            # Avoid appending /index
                            if new_import.endswith('/index'):
                                new_import = new_import[:-6]
                            line = line.replace(import_path, new_import)
                            changed = True
                    new_lines.append(line)
                
                if changed:
                    with open(file_path, 'w') as f:
                        f.writelines(new_lines)
                    print(f"Fixed {file_path}")

fix_imports_safely('/Users/veland/Downloads/Epstein Files/epstein-archive')
