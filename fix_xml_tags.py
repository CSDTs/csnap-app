#!/usr/bin/env python3
import re
import subprocess

def fix_xml_tags(content):
    # Replace self-closing tags with full opening/closing tags
    # Pattern: <tagname attributes/> -> <tagname attributes></tagname>
    # This handles both simple tags like <tag/> and complex ones like <tag attr="value"/>
    pattern = r'<([a-zA-Z][a-zA-Z0-9_-]*)([^>]*?)\s*/>'
    replacement = r'<\1\2></\1>'
    return re.sub(pattern, replacement, content)

def main():
    with open('libraries/beetle.xml', 'r') as f:
        content = f.read()
    
    # First format with xmllint
    result = subprocess.run(['xmllint', '--format', '/dev/stdin'], 
                          input=content, text=True, capture_output=True)
    
    if result.returncode != 0:
        print("Error formatting XML:", result.stderr)
        return
    
    formatted_content = result.stdout
    
    # Fix the self-closing tags
    fixed_content = fix_xml_tags(formatted_content)
    
    with open('libraries/beetle_formatted.xml', 'w') as f:
        f.write(fixed_content)
    
    print("Created beetle_formatted.xml with proper tag format")

if __name__ == '__main__':
    main()