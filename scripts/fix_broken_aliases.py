import os
import re

def fix_broken_aliases(root_dir):
    src_root = os.path.join(root_dir, 'src')
    
    # Map of common broken paths to correct paths
    corrections = {
        '@client/common/': '@client/components/common/',
        '@client/visualizations/': '@client/components/visualizations/',
        '@client/entities/': '@client/components/entities/',
        '@client/media/': '@client/components/media/',
        '@client/documents/': '@client/components/documents/',
        '@client/email/': '@client/components/email/',
        '@client/investigation/': '@client/components/investigation/',
        '@client/layout/': '@client/components/layout/',
        '@client/pages/': '@client/components/pages/',
        '@client/shared/': '@client/components/shared/',
        '@client/flights/': '@client/components/flights/',
        '@client/properties/': '@client/components/properties/',
    }

    for root, dirs, files in os.walk(src_root):
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                file_path = os.path.join(root, file)
                
                with open(file_path, 'r') as f:
                    content = f.read()
                
                new_content = content
                for broken, correct in corrections.items():
                    new_content = new_content.replace(broken, correct)
                
                if new_content != content:
                    with open(file_path, 'w') as f:
                        f.write(new_content)
                    print(f"Corrected {file_path}")

fix_broken_aliases('/Users/veland/Downloads/Epstein Files/epstein-archive')
